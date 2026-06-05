import prisma from "@/lib/prisma";

export type AutomationEventType =
  | "user_signed_up"
  | "email_verified"
  | "onboarding_not_completed"
  | "no_report_uploaded"
  | "report_uploaded"
  | "extraction_completed"
  | "ai_summary_ready"
  | "ai_summary_failed"
  | "report_awaiting_summary"
  | "inactive_3_days"
  | "inactive_7_days"
  | "monthly_newsletter"
  | "plan_limit_reached"
  | "payment_success"
  | "payment_failed"
  | "reminder_due";

export async function queueEmailAutomationEvent(params: {
  userId: string;
  eventType: AutomationEventType;
  payload?: Record<string, unknown>;
  idempotencyKey?: string;
  delayHours?: number;
}): Promise<string | null> {
  if (process.env.EMAIL_AUTOMATION_ENABLED === "false") return null;

  const runAfter = params.delayHours
    ? new Date(Date.now() + params.delayHours * 3600 * 1000).toISOString()
    : undefined;

  const payload = {
    ...(params.payload ?? {}),
    idempotencyKey: params.idempotencyKey,
    runAfter,
  };

  if (params.idempotencyKey) {
    const existing = await prisma.emailAutomationEvent.findFirst({
      where: {
        userId: params.userId,
        eventType: params.eventType,
        payload: { path: ["idempotencyKey"], equals: params.idempotencyKey },
      },
    });
    if (existing) return existing.id;
  }

  const row = await prisma.emailAutomationEvent.create({
    data: {
      userId: params.userId,
      eventType: params.eventType,
      payload,
    },
  });
  return row.id;
}
