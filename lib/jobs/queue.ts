import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export const JOB_TYPES = {
  DOCUMENT_EXTRACTION: "document_extraction",
  AI_SUMMARY_GENERATION: "ai_summary_generation",
  REPORT_POST_PROCESSING: "report_post_processing",
  REPORT_TRANSLATION: "report_translation",
  DATA_EXPORT: "data_export",
  EMAIL_SEND: "email_send",
  PUSH_SEND: "push_send",
  HEALTH_RISK_BACKFILL: "health_risk_backfill",
} as const;

export type JobType = (typeof JOB_TYPES)[keyof typeof JOB_TYPES];

export async function enqueueJob(params: {
  type: JobType;
  userId?: string | null;
  payload?: Record<string, unknown>;
  priority?: number;
  runAfter?: Date;
  maxAttempts?: number;
}) {
  return prisma.backgroundJob.create({
    data: {
      type: params.type,
      userId: params.userId ?? null,
      payload: (params.payload ?? {}) as Prisma.InputJsonValue,
      priority: params.priority ?? 5,
      runAfter: params.runAfter ?? null,
      maxAttempts: params.maxAttempts ?? 3,
      status: "queued",
    },
  });
}

export async function claimNextJob() {
  const now = new Date();
  const job = await prisma.backgroundJob.findFirst({
    where: {
      status: "queued",
      OR: [{ runAfter: null }, { runAfter: { lte: now } }],
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });
  if (!job) return null;

  return prisma.backgroundJob.update({
    where: { id: job.id },
    data: {
      status: "running",
      startedAt: now,
      attempts: { increment: 1 },
    },
  });
}

export async function completeJob(
  id: string,
  result?: Record<string, unknown>
) {
  return prisma.backgroundJob.update({
    where: { id },
    data: {
      status: "completed",
      completedAt: new Date(),
      result: (result ?? {}) as Prisma.InputJsonValue,
      error: null,
    },
  });
}

export async function failJob(id: string, error: string) {
  const job = await prisma.backgroundJob.findUnique({ where: { id } });
  if (!job) return null;
  const failed = job.attempts >= job.maxAttempts;
  return prisma.backgroundJob.update({
    where: { id },
    data: {
      status: failed ? "failed" : "queued",
      error: error.slice(0, 2000),
      failedAt: failed ? new Date() : null,
      runAfter: failed ? null : new Date(Date.now() + 60_000),
    },
  });
}
