import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/family-auth";
import { ok, validationError } from "@/lib/api-response";
import { askChat } from "@/lib/ai/ask-chat";
import { handleChatRouteError, chatMessageTooLong } from "@/lib/chat/chat-errors";
import { logChatAsk } from "@/lib/chat/safe-log";

const schema = z.object({
  message: z.string().min(1).max(2000),
  mode: z.enum(["general", "report", "family"]),
  reportId: z.string().optional(),
  familyMemberId: z.string().optional(),
  threadId: z.string().optional(),
  newThread: z.boolean().optional(),
  retryOfMessageId: z.string().optional(),
  retry: z.boolean().optional(),
  language: z.string().max(12).optional(),
});

export async function POST(req: NextRequest) {
  let messageLength: number | undefined;
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "Invalid input";
      if (msg.includes("2000")) return chatMessageTooLong();
      return validationError(msg);
    }

    const trimmed = parsed.data.message.trim();
    messageLength = trimmed.length;
    if (!trimmed.length) {
      return validationError("Message is required");
    }

    const result = await askChat({
      userId: auth.payload.userId,
      email: auth.payload.email,
      message: trimmed,
      mode: parsed.data.mode,
      reportId: parsed.data.reportId,
      familyMemberId: parsed.data.familyMemberId,
      threadId: parsed.data.threadId,
      newThread: parsed.data.newThread,
      retryOfMessageId: parsed.data.retryOfMessageId,
      retry: parsed.data.retry,
      language: parsed.data.language,
    });

    return ok(result);
  } catch (err) {
    logChatAsk(err, { source: "chat_ask", messageLength });
    return handleChatRouteError(err);
  }
}
