import prisma from "@/lib/prisma";
import { getModelForFeature, getMaxOutputTokens } from "@/lib/ai/model-router";
import { logAiUsage } from "@/lib/ai/token-usage";

const SUMMARY_THRESHOLD = 10;
const HISTORY_TAIL = 4;

export function selectChatHistory(params: {
  summary?: string | null;
  messages: Array<{ role: string; content: string }>;
}): {
  summary: string | null;
  recent: Array<{ role: "user" | "assistant"; content: string }>;
} {
  const eligible = params.messages.filter(
    (m) => m.role === "user" || m.role === "assistant"
  );
  const recent = eligible
    .slice(-HISTORY_TAIL)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
  return { summary: params.summary?.trim() || null, recent };
}

export async function maybeCompressChatThread(params: {
  threadId: string;
  userId: string;
  messageCount: number;
}): Promise<string | null> {
  const thread = await prisma.chatThread.findFirst({
    where: { id: params.threadId, userId: params.userId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!thread) return null;
  if (thread.messages.length <= SUMMARY_THRESHOLD) return thread.summary;

  const lastSummarized = thread.messageCountAtSummary ?? 0;
  if (thread.messages.length - lastSummarized < 4) {
    return thread.summary;
  }

  const toSummarize = thread.messages.slice(0, -HISTORY_TAIL);
  const transcript = toSummarize
    .map((m: { role: string; content: string }) => `${m.role}: ${m.content.slice(0, 800)}`)
    .join("\n");

  if (!process.env.OPENAI_API_KEY?.trim()) return thread.summary;

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = getModelForFeature("compression");

  try {
    const response = await client.chat.completions.create({
      model,
      temperature: 0.2,
      max_tokens: getMaxOutputTokens("compression"),
      messages: [
        {
          role: "system",
          content:
            "Summarize this medical chat thread for context compression. Keep lab values, diagnoses discussed, and user goals. Max 400 words.",
        },
        { role: "user", content: transcript.slice(0, 6000) },
      ],
    });
    const summary = response.choices[0]?.message?.content?.trim();
    if (!summary) return thread.summary;

    await prisma.chatThread.update({
      where: { id: thread.id },
      data: {
        summary,
        summaryUpdatedAt: new Date(),
        messageCountAtSummary: thread.messages.length,
      },
    });

    await logAiUsage({
      userId: params.userId,
      feature: "chat_compression",
      model,
      inputTokens: response.usage?.prompt_tokens,
      outputTokens: response.usage?.completion_tokens,
      source: "openai",
    });

    return summary;
  } catch (err) {
    console.warn("[chat-compression] failed:", err);
    return thread.summary;
  }
}
