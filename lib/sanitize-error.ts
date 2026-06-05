/** Maps internal/API errors to user-safe messages (no paths, tokens, or stack traces). */

const CODE_MESSAGES: Record<string, string> = {
  AI_NOT_CONFIGURED:
    "AI is not configured. Add OPENAI_API_KEY to enable summaries.",
  TEXT_NOT_READY:
    "Report text is not ready yet. Wait for extraction to finish or re-run OCR.",
  IMAGE_OCR_FAILED:
    "Image text could not be read. Try a clearer photo or re-run OCR.",
  OPENAI_OCR_NOT_CONFIGURED:
    "Image OCR requires OpenAI. Configure OPENAI_API_KEY.",
  UPLOAD_FAILED: "Upload failed. Check the file and try again.",
  PLAN_LIMIT_REACHED:
    "Monthly upload limit reached for your plan. Upgrade or wait until next month.",
  UPLOAD_LIMIT_REACHED:
    "Monthly upload limit reached. Usage resets on the Vaidya GPT server billing period, not your device date.",
  AI_SUMMARY_LIMIT_REACHED:
    "Monthly AI summary limit reached. Usage resets on the Vaidya GPT server billing period, not your device date.",
  FAMILY_MEMBER_LIMIT_REACHED:
    "Family member limit reached for your plan.",
  IMAGE_PAGE_LIMIT_REACHED:
    "Too many image pages for your plan. Remove pages or upgrade to Pro.",
  REPORT_SAVE_FAILED: "Could not save the report. Please try again.",
  FORBIDDEN: "You do not have access to this resource.",
  NOT_FOUND: "The requested item was not found.",
  VALIDATION_ERROR: "Invalid input. Check your entries and try again.",
  RATE_LIMITED: "Too many requests. Please wait and try again.",
  SERVER_ERROR: "Something went wrong. Please try again later.",
};

const RAW_PATTERNS: { pattern: RegExp; message: string }[] = [
  { pattern: /prisma|invocation|Unknown argument/i, message: CODE_MESSAGES.SERVER_ERROR },
  { pattern: /ENOENT|EPERM|EACCES|storage\/uploads/i, message: CODE_MESSAGES.UPLOAD_FAILED },
  { pattern: /openai|api\.openai/i, message: "AI service is temporarily unavailable. Try again later." },
  { pattern: /JWT|token|unauthorized/i, message: "Please sign in again." },
  { pattern: /tesseract|traineddata/i, message: CODE_MESSAGES.IMAGE_OCR_FAILED },
];

export type SafeErrorResult = {
  message: string;
  code?: string;
};

export function toUserSafeError(
  error: unknown,
  fallback = "Something went wrong. Please try again."
): SafeErrorResult {
  if (error && typeof error === "object") {
    const e = error as { code?: string; message?: string };
    if (e.code && CODE_MESSAGES[e.code]) {
      return { message: CODE_MESSAGES[e.code], code: e.code };
    }
    if (e.message && CODE_MESSAGES[e.message]) {
      return { message: CODE_MESSAGES[e.message], code: e.message };
    }
  }

  const text =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  if (text && CODE_MESSAGES[text]) {
    return { message: CODE_MESSAGES[text], code: text };
  }

  for (const { pattern, message } of RAW_PATTERNS) {
    if (text && pattern.test(text)) {
      return { message };
    }
  }

  if (text && text.length < 200 && !looksLikeRawError(text)) {
    return { message: text };
  }

  return { message: fallback };
}

function looksLikeRawError(text: string): boolean {
  return (
    /at\s+\S+\s+\(/i.test(text) ||
    /\/Users\/|C:\\|node_modules/i.test(text) ||
    /Invalid\s+`prisma/i.test(text)
  );
}

export function safeErrorMessage(
  error: unknown,
  fallback?: string
): string {
  return toUserSafeError(error, fallback).message;
}
