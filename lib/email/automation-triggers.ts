import { queueEmailAutomationEvent } from "@/lib/email/email-queue";
import prisma from "@/lib/prisma";

/** Fire-and-forget automation hooks — safe to call from API routes. */
export async function onUserSignedUp(userId: string) {
  await queueEmailAutomationEvent({
    userId,
    eventType: "user_signed_up",
    idempotencyKey: `signup_${userId}`,
  });
}

export async function onEmailVerified(userId: string) {
  await queueEmailAutomationEvent({
    userId,
    eventType: "email_verified",
    idempotencyKey: `verified_${userId}`,
  });
  await queueEmailAutomationEvent({
    userId,
    eventType: "no_report_uploaded",
    idempotencyKey: `no_upload_${userId}`,
    delayHours: 24,
  });
  await queueEmailAutomationEvent({
    userId,
    eventType: "onboarding_not_completed",
    idempotencyKey: `onboarding_${userId}`,
    delayHours: 24,
  });
}

export async function onReportUploaded(userId: string, filename?: string) {
  await queueEmailAutomationEvent({
    userId,
    eventType: "report_uploaded",
    payload: { filename },
    idempotencyKey: `upload_${userId}_${Date.now()}`,
  });
}

export async function onAiSummaryReady(userId: string, reportId: string) {
  await queueEmailAutomationEvent({
    userId,
    eventType: "ai_summary_ready",
    payload: { reportId },
    idempotencyKey: `summary_ready_${reportId}`,
  });
}

export async function onAiSummaryFailed(userId: string, documentId: string, message?: string) {
  await queueEmailAutomationEvent({
    userId,
    eventType: "ai_summary_failed",
    payload: { documentId, message },
    idempotencyKey: `summary_fail_${documentId}`,
  });
}

export async function onReportAwaitingSummary(userId: string, documentId: string) {
  await queueEmailAutomationEvent({
    userId,
    eventType: "report_awaiting_summary",
    payload: { documentId },
    idempotencyKey: `awaiting_${documentId}`,
    delayHours: 12,
  });
}

export async function onPaymentSuccess(
  userId: string,
  planName: string,
  amount?: string
) {
  await queueEmailAutomationEvent({
    userId,
    eventType: "payment_success",
    payload: { planName, amount },
    idempotencyKey: `pay_ok_${userId}_${Date.now()}`,
  });
}

export async function onPaymentFailed(userId: string) {
  await queueEmailAutomationEvent({
    userId,
    eventType: "payment_failed",
    idempotencyKey: `pay_fail_${userId}_${Date.now()}`,
  });
}

export async function onPlanLimitReached(userId: string, message: string) {
  await queueEmailAutomationEvent({
    userId,
    eventType: "plan_limit_reached",
    payload: { message },
    idempotencyKey: `limit_${userId}_${new Date().toISOString().slice(0, 10)}`,
  });
}

export async function onReminderDue(
  userId: string,
  reminderId: string,
  title: string,
  body: string,
  scheduledAt: Date
) {
  await queueEmailAutomationEvent({
    userId,
    eventType: "reminder_due",
    payload: { title, body, reminderId },
    idempotencyKey: `reminder_${reminderId}_${scheduledAt.toISOString()}`,
  });
}

export async function onDoctorShareCreated(userId: string, shareLink: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user?.email) return;
  const { sendTemplatedEmail } = await import("@/lib/email/send-templated");
  await sendTemplatedEmail({
    to: user.email,
    userId,
    templateKey: "doctor_share_created",
    data: { shareLink },
  });
}
