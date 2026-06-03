import { AppError } from "@/lib/app-error";

export function sanitizeDocumentErrorMessage(
  msg: string | null | undefined
): string | null {
  if (!msg?.trim()) return null;
  if (
    msg.includes("Unknown argument") ||
    msg.includes("tx.report.create") ||
    msg.includes("Invalid `tx.report.create`")
  ) {
    return "AI summary could not be saved. Please try again after system update.";
  }
  if (msg.length > 240) {
    return `${msg.slice(0, 240)}…`;
  }
  return msg;
}

export function formatAiSummaryClientError(
  err: Error & { code?: string },
  isDev = process.env.NODE_ENV === "development"
): string {
  switch (err.code) {
    case "AI_NOT_CONFIGURED": {
      const base =
        "AI summary requires OpenAI configuration. Mock summaries are disabled.";
      if (isDev) {
        return `${base} Add OPENAI_API_KEY to .env, then restart the dev server.`;
      }
      return base;
    }
    case "TEXT_NOT_READY":
      return "Text extraction is not completed or readable enough.";
    case "AI_GENERATION_FAILED":
      return "AI summary could not be generated from this report. Please try again.";
    case "REPORT_SAVE_FAILED":
      return "AI summary could not be saved. Please try again.";
    case "AI_LIMIT_REACHED":
      return err.message;
    case "REPORT_CONTEXT_REQUIRED":
      return "Health context is required before generating an AI summary.";
    default:
      return (
        sanitizeDocumentErrorMessage(err.message) ||
        err.message ||
        "Failed to generate summary"
      );
  }
}

export function assertOpenAiConfigured(): void {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new AppError(
      "AI summary requires OPENAI_API_KEY. Mock AI summaries are disabled.",
      "AI_NOT_CONFIGURED",
      503
    );
  }
}

export function assertExtractedTextReady(
  extractedText: string | null | undefined
): void {
  const text = extractedText?.trim() ?? "";
  if (text.length < 100) {
    throw new AppError(
      "Text extraction is not completed or readable enough.",
      "TEXT_NOT_READY",
      400
    );
  }
}
