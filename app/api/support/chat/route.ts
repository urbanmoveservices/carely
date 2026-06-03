import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/family-auth";
import { ok, validationError, serverError } from "@/lib/api-response";
import { answerSupportChat, getOrCreateSupportThread } from "@/lib/chat/support-chat";
import { serializeChatThread } from "@/lib/chat/thread-utils";
import { handleChatRouteError } from "@/lib/chat/chat-errors";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const thread = await getOrCreateSupportThread(auth.payload.userId);
    return ok({ thread: serializeChatThread(thread) });
  } catch (err) {
    console.error("[support_chat_get]", err);
    return serverError();
  }
}

const postSchema = z.object({
  message: z.string().min(1).max(2000),
  language: z.string().max(10).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const body = await req.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message || "Invalid input");
    }

    const result = await answerSupportChat({
      userId: auth.payload.userId,
      message: parsed.data.message,
      language: parsed.data.language,
    });
    return ok(result);
  } catch (err) {
    const handled = handleChatRouteError(err);
    if (handled) return handled;
    console.error("[support_chat_post]", err);
    return serverError();
  }
}
