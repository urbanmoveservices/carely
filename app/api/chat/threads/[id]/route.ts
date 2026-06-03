import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/family-auth";
import { ok, notFound, serverError } from "@/lib/api-response";
import { deleteChatThread, getChatThread } from "@/lib/ai/ask-chat";
import { logChatError } from "@/lib/chat/safe-log";
import { handleChatRouteError } from "@/lib/chat/chat-errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id } = await params;

    const thread = await getChatThread(auth.payload.userId, id);
    if (!thread) return notFound("Chat thread not found");

    return ok({ thread });
  } catch (err) {
    logChatError("chat_thread_get", err);
    return handleChatRouteError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id } = await params;

    const deleted = await deleteChatThread(auth.payload.userId, id);
    if (!deleted) return notFound("Chat thread not found");

    return ok({ deleted: true });
  } catch (err) {
    logChatError("chat_thread_delete", err);
    return handleChatRouteError(err);
  }
}
