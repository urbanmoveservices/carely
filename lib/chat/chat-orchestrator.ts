import prisma from "@/lib/prisma";
import { getLanguageName } from "@/lib/translation/language-map";
import { checkRateLimit, RATE_LIMITS, shouldBypassAuthRateLimit } from "@/lib/rate-limit";
import {
  canSendChatMessage,
  incrementChatMessageUsage,
} from "@/lib/plans";
import {
  detectEmergencyMessage,
  EMERGENCY_SAFETY_REPLY,
} from "@/lib/chat/safety-prompt";
import {
  AiChatNotConfiguredError,
  generateChatReply,
} from "@/lib/chat/openai-chat";
import { appendChatMessages } from "@/lib/chat/thread-utils";
import {
  buildFamilyChatContext,
  buildReportChatContext,
  buildSupportChatContext,
} from "@/lib/chat/context-builders";
import type { ChatBotType } from "@/lib/chat/safety-prompt";

export class ChatRateLimitedError extends Error {
  code = "RATE_LIMITED";
}

export class ChatMonthlyLimitError extends Error {
  code = "CHAT_LIMIT_REACHED";
  constructor() {
    super("Your monthly AI chat limit is reached. Upgrade your plan to continue.");
  }
}

async function resolveUserLanguage(userId: string, override?: string) {
  const pref = await prisma.userPreference.findUnique({
    where: { userId },
    select: { language: true },
  });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferredLanguage: true, email: true },
  });
  const lang = override || pref?.language || user?.preferredLanguage || "en";
  return { lang, langName: getLanguageName(lang), email: user?.email ?? "" };
}

async function assertChatAllowed(userId: string, email: string) {
  if (!shouldBypassAuthRateLimit(email)) {
    const burst = checkRateLimit("chat-burst", userId, RATE_LIMITS.CHAT_BURST);
    if (!burst.allowed) throw new ChatRateLimitedError();
  }
  const monthly = await canSendChatMessage(userId);
  if (!monthly.allowed) throw new ChatMonthlyLimitError();
}

async function logChatFailure(userId: string, type: ChatBotType, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  try {
    await prisma.errorLog.create({
      data: {
        userId,
        source: "chat",
        message: `chat_${type}_failed`,
        metadata: { error: message.slice(0, 500) },
        severity: "warning",
      },
    });
  } catch {
    /* ignore */
  }
}

export async function getOrCreateReportThread(userId: string, reportId: string) {
  const existing = await prisma.chatThread.findFirst({
    where: { userId, reportId, type: "report" },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
  });
  if (existing) return existing;
  return prisma.chatThread.create({
    data: { userId, reportId, type: "report", title: "Report chat" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

export async function getOrCreateFamilyThread(userId: string) {
  const existing = await prisma.chatThread.findFirst({
    where: { userId, type: "family" },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
  });
  if (existing) return existing;
  return prisma.chatThread.create({
    data: { userId, type: "family", title: "Family health chat" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

export async function getOrCreateSupportThread(userId: string) {
  const existing = await prisma.chatThread.findFirst({
    where: { userId, type: "support" },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
  });
  if (existing) return existing;
  return prisma.chatThread.create({
    data: { userId, type: "support", title: "Support chat" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

type ChatResult = { reply: string; emergency?: boolean };

async function runChat(params: {
  userId: string;
  type: ChatBotType;
  message: string;
  language?: string;
  context: Record<string, unknown>;
  getThread: () => Promise<{ id: string; messages: { role: string; content: string }[] }>;
}): Promise<ChatResult> {
  const { lang, langName, email } = await resolveUserLanguage(params.userId, params.language);

  if (detectEmergencyMessage(params.message)) {
    const thread = await params.getThread();
    await appendChatMessages(thread.id, params.message, EMERGENCY_SAFETY_REPLY, {
      emergency: true,
    });
    return { reply: EMERGENCY_SAFETY_REPLY, emergency: true };
  }

  await assertChatAllowed(params.userId, email);

  const thread = await params.getThread();
  const history = thread.messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  let reply: string;
  try {
    reply = await generateChatReply({
      type: params.type,
      message: params.message,
      context: params.context,
      language: lang,
      languageName: langName,
      history,
    });
  } catch (err) {
    await logChatFailure(params.userId, params.type, err);
    throw err;
  }

  await appendChatMessages(thread.id, params.message, reply);
  await incrementChatMessageUsage(params.userId);

  return { reply };
}

export async function answerReportChat(params: {
  userId: string;
  reportId: string;
  message: string;
  language?: string;
}): Promise<ChatResult> {
  const context = await buildReportChatContext(params.userId, params.reportId);
  if (!context) throw new Error("Report not found");

  return runChat({
    userId: params.userId,
    type: "report",
    message: params.message,
    language: params.language,
    context,
    getThread: () => getOrCreateReportThread(params.userId, params.reportId),
  });
}

export async function answerFamilyChat(params: {
  userId: string;
  message: string;
  language?: string;
}): Promise<ChatResult> {
  const context = await buildFamilyChatContext(params.userId);
  return runChat({
    userId: params.userId,
    type: "family",
    message: params.message,
    language: params.language,
    context,
    getThread: () => getOrCreateFamilyThread(params.userId),
  });
}

export async function answerSupportChat(params: {
  userId: string;
  message: string;
  language?: string;
}): Promise<ChatResult> {
  const context = buildSupportChatContext();
  return runChat({
    userId: params.userId,
    type: "support",
    message: params.message,
    language: params.language,
    context,
    getThread: () => getOrCreateSupportThread(params.userId),
  });
}
