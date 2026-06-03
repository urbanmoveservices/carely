import { NextResponse } from "next/server";
import {
  fail,
  failWithMeta,
  rateLimited,
  serverError,
  serviceUnavailable,
  unauthorized,
  validationError,
} from "@/lib/api-response";
import { AiChatNotConfiguredError } from "@/lib/ai/direct-chat";
import { AiChatServiceError } from "@/lib/ai/chat-errors-ai";
import {
  ChatDailyLimitError,
  ChatRateLimitedError,
  ChatReportNotFoundError,
  ChatFamilyMemberNotFoundError,
  ChatThreadNotFoundError,
  ChatMonthlyLimitError,
} from "@/lib/ai/ask-chat";

export function handleChatRouteError(err: unknown): NextResponse {
  if (err instanceof AiChatNotConfiguredError) {
    return serviceUnavailable(err.message, "OPENAI_NOT_CONFIGURED");
  }
  if (err instanceof AiChatServiceError) {
    return serviceUnavailable(err.message, err.code || "AI_CHAT_FAILED");
  }
  if (err instanceof ChatRateLimitedError) {
    return fail(err.message, 429, "CHAT_RATE_LIMITED");
  }
  if (err instanceof ChatDailyLimitError || err instanceof ChatMonthlyLimitError) {
    return failWithMeta(err.message, 429, {
      code: "CHAT_DAILY_LIMIT_REACHED",
      limit: err.limit,
      upgradeUrl: "/billing",
    });
  }
  if (err instanceof ChatReportNotFoundError) {
    return fail("Report not found", 404, "CHAT_REPORT_NOT_FOUND");
  }
  if (err instanceof ChatFamilyMemberNotFoundError) {
    return fail("Family member not found", 404, "CHAT_FAMILY_MEMBER_NOT_FOUND");
  }
  if (err instanceof ChatThreadNotFoundError) {
    return fail("Chat thread not found", 404, "CHAT_THREAD_NOT_FOUND");
  }
  if (err instanceof Error && err.message === "reportId required") {
    return fail("reportId required", 400, "CHAT_REPORT_NOT_FOUND");
  }
  return serverError();
}

export function chatAuthRequired(): NextResponse {
  return unauthorized("Authentication required");
}

export function chatMessageRequired(): NextResponse {
  return validationError("Message is required");
}

export function chatMessageTooLong(): NextResponse {
  return fail("Message must be at most 2000 characters", 400, "CHAT_MESSAGE_TOO_LONG");
}
