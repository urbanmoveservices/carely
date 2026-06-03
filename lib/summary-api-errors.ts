import { AppError, isAppError } from "@/lib/app-error";
import { fail } from "@/lib/api-response";
import { Prisma } from "@prisma/client";

export function toSummaryApiResponse(err: unknown) {
  if (isAppError(err)) {
    return fail(err.message, err.status, err.code);
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return fail("Could not save AI summary.", 500, "REPORT_SAVE_FAILED");
  }
  const message = err instanceof Error ? err.message : String(err);
  if (
    message.includes("Unknown argument") ||
    message.includes("tx.report.create")
  ) {
    return fail("Could not save AI summary.", 500, "REPORT_SAVE_FAILED");
  }
  return fail(
    "AI summary could not be generated from this report. Please try again.",
    502,
    "AI_GENERATION_FAILED"
  );
}
