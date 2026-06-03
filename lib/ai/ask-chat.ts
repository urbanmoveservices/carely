import prisma from "@/lib/prisma";
import { getLanguageName } from "@/lib/translation/language-map";
import { shouldBypassAuthRateLimit } from "@/lib/rate-limit";
import {
  checkChatBurstLimit,
  checkChatDailyLimit,
  getChatDailyLimitForPlan,
} from "@/lib/chat/chat-limits";
import { incrementChatMessageUsage } from "@/lib/plans";
import {
  buildGeneralChatContext,
  buildFamilyChatContext,
  buildReportChatContext,
} from "@/lib/ai/chat-context-builder";
import {
  answerUserHealthQuestion,
  AiChatNotConfiguredError,
} from "@/lib/ai/direct-chat";
import {
  appendChatMessages,
  replaceFailedAssistantMessage,
  serializeChatThread,
} from "@/lib/chat/thread-utils";
import { enrichChatSources } from "@/lib/chat/source-hrefs";
import { generateThreadTitle } from "@/lib/chat/thread-title";
import {
  assertFamilyMemberOwned,
  assertReportOwned,
  assertThreadOwned,
  ChatFamilyMemberNotFoundError,
  ChatReportNotFoundError,
  ChatThreadNotFoundError,
} from "@/lib/chat/chat-access";
import { AiChatServiceError } from "@/lib/ai/chat-errors-ai";
import {
  isNutritionQuestion,
  runNutritionToolsForMessage,
} from "@/lib/nutrition/chat-tools";

export type ChatAskMode = "general" | "report" | "family";

export type ChatAskInput = {
  userId: string;
  email: string;
  message: string;
  mode: ChatAskMode;
  reportId?: string;
  familyMemberId?: string;
  threadId?: string;
  newThread?: boolean;
  retryOfMessageId?: string;
  retry?: boolean;
  language?: string;
};

export type ChatSourceOut = {
  type: string;
  id: string;
  title: string;
  date?: string;
  href?: string;
  familyMemberId?: string;
};

export type ChatAskOutput = {
  threadId: string;
  answer: string;
  sources: ChatSourceOut[];
  safetyLevel: "normal" | "caution" | "urgent";
  suggestedQuestions: string[];
  assistantMessageId?: string;
};

export class ChatRateLimitedError extends Error {
  code = "CHAT_RATE_LIMITED";
  constructor() {
    super("You are sending messages too quickly. Please wait a moment.");
  }
}

export class ChatDailyLimitError extends Error {
  code = "CHAT_DAILY_LIMIT_REACHED";
  limit: number;
  constructor(limit: number) {
    super("Daily chat limit reached for your plan.");
    this.limit = limit;
  }
}

/** @deprecated use ChatDailyLimitError */
export class ChatMonthlyLimitError extends ChatDailyLimitError {}

function threadTypeForMode(mode: ChatAskMode): string {
  if (mode === "report") return "report";
  if (mode === "family") return "family";
  return "general";
}

async function resolveLanguage(userId: string, language?: string) {
  if (language && language !== "app") {
    if (language === "hinglish") return { code: "hinglish", name: "Hinglish" };
    return { code: language, name: getLanguageName(language) };
  }
  const pref = await prisma.userPreference.findUnique({
    where: { userId },
    select: { language: true },
  });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferredLanguage: true },
  });
  const code = pref?.language || user?.preferredLanguage || "en";
  return { code: language === "app" ? "app" : code, name: getLanguageName(code) };
}

async function assertChatAllowed(userId: string, email: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentPlan: true },
  });
  const plan = user?.currentPlan ?? "free";

  if (!shouldBypassAuthRateLimit(email)) {
    const burst = checkChatBurstLimit(userId);
    if (!burst.allowed) throw new ChatRateLimitedError();
    const daily = checkChatDailyLimit(userId, plan);
    if (!daily.allowed) {
      throw new ChatDailyLimitError(getChatDailyLimitForPlan(plan));
    }
  }
}

async function getOrCreateThread(params: {
  userId: string;
  mode: ChatAskMode;
  reportId?: string;
  familyMemberId?: string;
  threadId?: string;
  newThread?: boolean;
  firstMessage?: string;
  title?: string;
}) {
  if (params.threadId) {
    const existing = await prisma.chatThread.findFirst({
      where: { id: params.threadId, userId: params.userId },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
    });
    if (existing) return existing;
    throw new ChatThreadNotFoundError();
  }

  const type = threadTypeForMode(params.mode);
  const defaultTitle =
    params.mode === "report"
      ? "Report chat"
      : params.mode === "family"
        ? "Family health chat"
        : "Vaidya GPT chat";
  const title =
    params.title ||
    (params.firstMessage ? generateThreadTitle(params.firstMessage) : defaultTitle);

  if (!params.newThread) {
    const where =
      params.mode === "report" && params.reportId
        ? { userId: params.userId, type, reportId: params.reportId }
        : params.mode === "family"
          ? { userId: params.userId, type: "family" as const }
          : { userId: params.userId, type: "general" as const };

    const found = await prisma.chatThread.findFirst({
      where,
      orderBy: { updatedAt: "desc" },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
    });
    if (found) return found;
  }

  return prisma.chatThread.create({
    data: {
      userId: params.userId,
      type,
      reportId: params.mode === "report" ? params.reportId : null,
      familyMemberId: params.familyMemberId ?? null,
      title,
    },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

export async function askChat(input: ChatAskInput): Promise<ChatAskOutput> {
  await assertChatAllowed(input.userId, input.email);

  if (input.mode === "report" && input.reportId) {
    await assertReportOwned(input.userId, input.reportId);
  }
  if (input.familyMemberId) {
    await assertFamilyMemberOwned(input.userId, input.familyMemberId);
  }
  if (input.threadId) {
    await assertThreadOwned(input.userId, input.threadId);
  }

  let context: Record<string, unknown> | null = null;

  if (input.mode === "report") {
    if (!input.reportId) throw new ChatReportNotFoundError();
    context = await buildReportChatContext(input.userId, input.reportId);
    if (!context) throw new ChatReportNotFoundError();
  } else if (input.mode === "family") {
    if (input.familyMemberId) {
      await assertFamilyMemberOwned(input.userId, input.familyMemberId);
    }
    context = await buildFamilyChatContext(input.userId, input.familyMemberId);
    if (!context) throw new ChatFamilyMemberNotFoundError();
  } else {
    context = await buildGeneralChatContext(input.userId);
  }

  if (isNutritionQuestion(input.message)) {
    const nutritionTools = await runNutritionToolsForMessage(input.message);
    if (nutritionTools) {
      context = { ...context, nutritionTools };
    }
  }

  const { code: langCode } = await resolveLanguage(input.userId, input.language);
  const isRetry = Boolean(
    input.threadId && (input.retry || input.retryOfMessageId)
  );

  const thread = await getOrCreateThread({
    userId: input.userId,
    mode: input.mode,
    reportId: input.reportId,
    familyMemberId: input.familyMemberId,
    threadId: isRetry ? input.threadId : input.threadId,
    newThread: isRetry ? false : input.newThread,
    firstMessage: input.newThread || !input.threadId ? input.message : undefined,
  });

  if (
    !isRetry &&
    thread.messages.length === 0 &&
    thread.title &&
    ["Report chat", "Family health chat", "Vaidya GPT chat"].includes(thread.title)
  ) {
    await prisma.chatThread.update({
      where: { id: thread.id },
      data: { title: generateThreadTitle(input.message) },
    });
  }

  const history = thread.messages
    .filter((m: { role: string; content: string }) => m.role === "user" || m.role === "assistant")
    .filter((m: { id: string }) => m.id !== input.retryOfMessageId)
    .map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  let result;
  try {
    result = await answerUserHealthQuestion({
      message: input.message,
      mode: input.mode,
      context,
      language: langCode,
      history,
    });
  } catch (err) {
    if (err instanceof AiChatNotConfiguredError || err instanceof AiChatServiceError) {
      throw err;
    }
    throw new AiChatServiceError();
  }

  const sources = enrichChatSources(
    result.sources.map((s) => ({
      type: s.type,
      id: s.id,
      title: s.title,
      date: s.date,
      familyMemberId:
        s.type === "family" ? s.id : undefined,
    }))
  );

  const meta = {
    sources,
    safetyLevel: result.safetyLevel,
    suggestedQuestions: result.suggestedQuestions,
    status: "ok",
  };

  let assistantMessageId: string | undefined;

  if (isRetry && input.retryOfMessageId) {
    const ok = await replaceFailedAssistantMessage(
      input.retryOfMessageId,
      thread.id,
      input.userId,
      result.answer,
      meta
    );
    if (!ok) {
      await appendChatMessages(thread.id, input.message, result.answer, meta, {
        skipUserMessage: true,
      });
    }
    assistantMessageId = input.retryOfMessageId;
  } else {
    await appendChatMessages(thread.id, input.message, result.answer, meta, {
      skipUserMessage: isRetry,
    });
    const last = await prisma.chatMessage.findFirst({
      where: { threadId: thread.id, role: "assistant" },
      orderBy: { createdAt: "desc" },
    });
    assistantMessageId = last?.id;
  }

  await incrementChatMessageUsage(input.userId);

  return {
    threadId: thread.id,
    answer: result.answer,
    sources,
    safetyLevel: result.safetyLevel,
    suggestedQuestions: result.suggestedQuestions,
    assistantMessageId,
  };
}

export type ListThreadsFilters = {
  type?: "general" | "report" | "family";
  reportId?: string;
  familyMemberId?: string;
};

export async function listChatThreads(userId: string, filters?: ListThreadsFilters) {
  const where: {
    userId: string;
    type?: string | { in: string[] };
    reportId?: string;
    familyMemberId?: string;
  } = {
    userId,
    type: { in: ["general", "report", "family"] },
  };

  if (filters?.type) where.type = filters.type;
  if (filters?.reportId) where.reportId = filters.reportId;
  if (filters?.familyMemberId) where.familyMemberId = filters.familyMemberId;

  const threads = await prisma.chatThread.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      report: { select: { id: true, document: { select: { originalFilename: true } } } },
      _count: { select: { messages: true } },
    },
  });

  return threads.map((t: (typeof threads)[number]) => ({
    id: t.id,
    type: t.type,
    title: t.title,
    reportId: t.reportId,
    familyMemberId: t.familyMemberId,
    updatedAt: t.updatedAt.toISOString(),
    messageCount: t._count.messages,
    lastMessagePreview: t.messages[0]?.content?.slice(0, 120) ?? null,
    lastMessage: t.messages[0]?.content?.slice(0, 120) ?? null,
    reportFilename: t.report?.document?.originalFilename ?? null,
  }));
}

export async function createChatThread(params: {
  userId: string;
  type: "general" | "report" | "family";
  reportId?: string;
  familyMemberId?: string;
  title?: string;
}) {
  if (params.type === "report" && params.reportId) {
    await assertReportOwned(params.userId, params.reportId);
  }
  if (params.familyMemberId) {
    await assertFamilyMemberOwned(params.userId, params.familyMemberId);
  }

  const thread = await prisma.chatThread.create({
    data: {
      userId: params.userId,
      type: params.type,
      reportId: params.type === "report" ? params.reportId : null,
      familyMemberId: params.familyMemberId ?? null,
      title: params.title || "New chat",
    },
  });

  return { id: thread.id, type: thread.type, title: thread.title };
}

export async function getChatThread(userId: string, threadId: string) {
  const thread = await prisma.chatThread.findFirst({
    where: { id: threadId, userId },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 100 } },
  });
  if (!thread) return null;
  return serializeChatThread(thread);
}

export async function deleteChatThread(userId: string, threadId: string) {
  const thread = await prisma.chatThread.findFirst({
    where: { id: threadId, userId },
  });
  if (!thread) return false;
  await prisma.chatThread.delete({ where: { id: threadId } });
  return true;
}

export async function answerReportChat(params: {
  userId: string;
  email: string;
  reportId: string;
  message: string;
  language?: string;
  threadId?: string;
  newThread?: boolean;
  retryOfMessageId?: string;
}) {
  const out = await askChat({
    userId: params.userId,
    email: params.email,
    message: params.message,
    mode: "report",
    reportId: params.reportId,
    language: params.language,
    threadId: params.threadId,
    newThread: params.newThread,
    retryOfMessageId: params.retryOfMessageId,
  });
  return {
    reply: out.answer,
    answer: out.answer,
    emergency: out.safetyLevel === "urgent",
    sources: out.sources,
    suggestedQuestions: out.suggestedQuestions,
    threadId: out.threadId,
  };
}

export async function answerFamilyChat(params: {
  userId: string;
  email: string;
  message: string;
  language?: string;
  threadId?: string;
  newThread?: boolean;
  retryOfMessageId?: string;
}) {
  const out = await askChat({
    userId: params.userId,
    email: params.email,
    message: params.message,
    mode: "family",
    language: params.language,
    threadId: params.threadId,
    newThread: params.newThread,
    retryOfMessageId: params.retryOfMessageId,
  });
  return {
    reply: out.answer,
    answer: out.answer,
    emergency: out.safetyLevel === "urgent",
    sources: out.sources,
    suggestedQuestions: out.suggestedQuestions,
    threadId: out.threadId,
  };
}

export async function getOrCreateReportThread(userId: string, reportId: string) {
  return getOrCreateThread({ userId, mode: "report", reportId });
}

export async function getOrCreateFamilyThread(userId: string) {
  return getOrCreateThread({ userId, mode: "family" });
}

export {
  AiChatNotConfiguredError,
  ChatReportNotFoundError,
  ChatFamilyMemberNotFoundError,
  ChatThreadNotFoundError,
};
