export class AiChatServiceError extends Error {
  code = "AI_CHAT_FAILED";
  constructor(message = "AI service is temporarily unavailable. Please try again.") {
    super(message);
    this.name = "AiChatServiceError";
  }
}

export function isOpenAiTransientError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = "status" in err ? Number((err as { status?: number }).status) : NaN;
  if (status === 429 || status === 500 || status === 502 || status === 503) return true;
  const code = "code" in err ? String((err as { code?: string }).code) : "";
  return code === "insufficient_quota" || code === "rate_limit_exceeded";
}
