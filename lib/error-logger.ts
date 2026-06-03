/**
 * Server-side error logging — re-exports and extends lib/error-log.ts.
 * Never logs passwords, tokens, or full medical text.
 */
import { logError as persistError } from "@/lib/error-log";
import { safeErrorMessage } from "@/lib/sanitize-error";

export { logError as logErrorPersist } from "@/lib/error-log";

export async function logError(params: {
  source: string;
  error?: unknown;
  message?: string;
  userId?: string | null;
  severity?: string;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  const message =
    params.message ??
    (params.error instanceof Error
      ? params.error.message
      : typeof params.error === "string"
        ? params.error
        : "Unknown error");

  const stack =
    params.error instanceof Error ? params.error.stack?.slice(0, 4000) : undefined;

  const code =
    params.error &&
    typeof params.error === "object" &&
    "code" in params.error &&
    typeof (params.error as { code: unknown }).code === "string"
      ? (params.error as { code: string }).code
      : undefined;

  await persistError({
    source: params.source,
    message: safeErrorMessage(params.error, message).slice(0, 2000),
    userId: params.userId,
    stack,
    severity: params.severity ?? "error",
    metadata: {
      ...params.metadata,
      ...(code ? { code } : {}),
    },
  });
}
