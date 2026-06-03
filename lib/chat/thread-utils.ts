import type { ChatMessage, ChatThread } from "@prisma/client";
import prisma from "@/lib/prisma";

export type SerializedChatMessage = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
};

export type SerializedChatThread = {
  id: string;
  type: string;
  title: string | null;
  reportId: string | null;
  familyMemberId: string | null;
  messages: SerializedChatMessage[];
};

export function serializeChatThread(
  thread: ChatThread & { messages: ChatMessage[] }
): SerializedChatThread {
  return {
    id: thread.id,
    type: thread.type,
    title: thread.title,
    reportId: thread.reportId,
    familyMemberId: thread.familyMemberId,
    messages: thread.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      metadata: (m.metadata as Record<string, unknown> | null) ?? null,
    })),
  };
}

export async function appendChatMessages(
  threadId: string,
  userMessage: string,
  assistantMessage: string,
  metadata?: Record<string, unknown>,
  options?: { skipUserMessage?: boolean }
) {
  const rows: Array<{
    threadId: string;
    role: string;
    content: string;
    metadata?: object;
  }> = [];
  if (!options?.skipUserMessage) {
    rows.push({ threadId, role: "user", content: userMessage });
  }
  rows.push({
    threadId,
    role: "assistant",
    content: assistantMessage,
    metadata: metadata ? (metadata as object) : undefined,
  });
  await prisma.chatMessage.createMany({ data: rows });
  await prisma.chatThread.update({
    where: { id: threadId },
    data: { updatedAt: new Date() },
  });
}

export async function replaceFailedAssistantMessage(
  messageId: string,
  threadId: string,
  userId: string,
  newContent: string,
  metadata?: Record<string, unknown>
) {
  const msg = await prisma.chatMessage.findFirst({
    where: { id: messageId, threadId, role: "assistant" },
    include: { thread: { select: { userId: true } } },
  });
  if (!msg || msg.thread.userId !== userId) return false;
  await prisma.chatMessage.update({
    where: { id: messageId },
    data: {
      content: newContent,
      metadata: metadata ? (metadata as object) : { status: "ok" },
    },
  });
  await prisma.chatThread.update({
    where: { id: threadId },
    data: { updatedAt: new Date() },
  });
  return true;
}

export async function recordFailedAssistant(
  threadId: string,
  userMessage: string,
  errorCode: string,
  options?: { skipUserMessage?: boolean }
) {
  const content = "Vaidya GPT could not answer right now.";
  await appendChatMessages(threadId, userMessage, content, {
    status: "failed",
    errorCode,
  }, options);
}

export async function clearChatThreadMessages(threadId: string, userId: string) {
  const thread = await prisma.chatThread.findFirst({
    where: { id: threadId, userId },
  });
  if (!thread) return false;
  await prisma.chatMessage.deleteMany({ where: { threadId } });
  return true;
}
