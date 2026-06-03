import { buildSafetySystemPrompt, type ChatBotType } from "@/lib/chat/safety-prompt";

export function isOpenAiChatConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function getOpenAiChatModel(): string {
  return (
    process.env.OPENAI_CHAT_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-4o-mini"
  );
}

export class AiChatNotConfiguredError extends Error {
  code = "AI_CHAT_NOT_CONFIGURED";
  constructor() {
    super("AI chat is not configured.");
  }
}

export async function generateChatReply(params: {
  type: ChatBotType;
  message: string;
  context: Record<string, unknown>;
  language: string;
  languageName: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<string> {
  if (!isOpenAiChatConfigured()) {
    throw new AiChatNotConfiguredError();
  }

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = getOpenAiChatModel();

  const system = `${buildSafetySystemPrompt(params.type, params.languageName)}\n\nContext JSON:\n${JSON.stringify(params.context)}`;

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: system },
  ];

  const history = (params.history ?? []).slice(-8);
  for (const h of history) {
    if (h.role === "user" || h.role === "assistant") {
      messages.push({ role: h.role, content: h.content.slice(0, 2000) });
    }
  }
  messages.push({ role: "user", content: params.message.slice(0, 2000) });

  const response = await client.chat.completions.create({
    model,
    temperature: 0.3,
    max_tokens: 900,
    messages,
  });

  return (
    response.choices[0]?.message?.content?.trim() ||
    "I could not generate a response. Please discuss your health questions with a qualified doctor."
  );
}
