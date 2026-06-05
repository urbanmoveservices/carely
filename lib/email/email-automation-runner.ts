import prisma from "@/lib/prisma";
import { absoluteUrl } from "@/lib/app-url";
import { sendTemplatedEmail } from "@/lib/email/send-templated";
import type { EmailTemplateKey } from "@/lib/email/template-keys";
import type { AutomationEventType } from "@/lib/email/email-queue";

function isDue(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return true;
  const runAfter = (payload as { runAfter?: string }).runAfter;
  if (!runAfter) return true;
  return new Date(runAfter) <= new Date();
}

async function resolveTemplate(
  eventType: AutomationEventType,
  payload: Record<string, unknown>
): Promise<{ key: EmailTemplateKey; data: Record<string, string> } | null> {
  const name = (payload.name as string) || "there";
  switch (eventType) {
    case "email_verified":
      return { key: "welcome_verified", data: { name } };
    case "onboarding_not_completed":
      return { key: "onboarding_incomplete", data: { name } };
    case "no_report_uploaded":
      return { key: "first_report_upload_reminder", data: { name } };
    case "report_uploaded":
      return { key: "report_upload_received", data: { name, filename: String(payload.filename || "") } };
    case "ai_summary_ready":
      return {
        key: "ai_summary_ready",
        data: {
          name,
          reportLink: payload.reportId
            ? absoluteUrl(`/reports/${payload.reportId}`)
            : absoluteUrl("/dashboard"),
        },
      };
    case "ai_summary_failed":
      return {
        key: "ai_summary_failed",
        data: {
          name,
          retryLink: payload.documentId
            ? absoluteUrl(`/documents/${payload.documentId}/generate-summary`)
            : absoluteUrl("/dashboard"),
          message: String(payload.message || ""),
        },
      };
    case "report_awaiting_summary":
      return {
        key: "report_awaiting_summary",
        data: {
          name,
          reportLink: payload.documentId
            ? absoluteUrl(`/documents/${payload.documentId}/generate-summary`)
            : absoluteUrl("/dashboard"),
        },
      };
    case "inactive_3_days":
      return { key: "inactive_3_days", data: { name } };
    case "inactive_7_days":
      return { key: "inactive_7_days", data: { name } };
    case "plan_limit_reached":
      return {
        key: "plan_limit_reached",
        data: { name, message: String(payload.message || "") },
      };
    case "payment_success":
      return {
        key: "payment_success",
        data: {
          name,
          planName: String(payload.planName || ""),
          amount: String(payload.amount || ""),
        },
      };
    case "payment_failed":
      return { key: "payment_failed", data: { name } };
    case "reminder_due":
      return {
        key: "reminder_due",
        data: {
          name,
          title: String(payload.title || "Reminder"),
          body: String(payload.body || "You have a health reminder."),
        },
      };
    case "monthly_newsletter":
      return {
        key: "monthly_health_newsletter",
        data: {
          body: String(payload.body || "Monthly health tips from Vaidya GPT."),
          preview: String(payload.preview || ""),
        },
      };
    default:
      return null;
  }
}

export async function processEmailAutomationEvent(eventId: string): Promise<boolean> {
  const event = await prisma.emailAutomationEvent.findUnique({
    where: { id: eventId },
    include: { user: { select: { id: true, email: true, name: true, emailVerified: true } } },
  });
  if (!event || event.processed) return false;
  if (!isDue(event.payload)) return false;

  const payload = (event.payload as Record<string, unknown>) ?? {};
  const resolved = await resolveTemplate(event.eventType as AutomationEventType, {
    ...payload,
    name: event.user.name || "there",
  });

  if (!resolved || event.eventType === "user_signed_up") {
    await prisma.emailAutomationEvent.update({
      where: { id: event.id },
      data: { processed: true, processedAt: new Date() },
    });
    return true;
  }

  if (event.eventType === "email_verified" && !event.user.emailVerified) {
    return false;
  }

  await sendTemplatedEmail({
    to: event.user.email,
    userId: event.user.id,
    templateKey: resolved.key,
    data: resolved.data,
    includeUnsubscribe: resolved.key !== "reminder_due",
  });

  await prisma.emailAutomationEvent.update({
    where: { id: event.id },
    data: { processed: true, processedAt: new Date() },
  });
  return true;
}

export async function runEmailAutomations(limit = 50): Promise<{
  processed: number;
  skipped: number;
  inactive3: number;
  inactive7: number;
  remindersQueued: number;
}> {
  if (process.env.EMAIL_AUTOMATION_ENABLED === "false") {
    return { processed: 0, skipped: 0, inactive3: 0, inactive7: 0, remindersQueued: 0 };
  }

  const pending = await prisma.emailAutomationEvent.findMany({
    where: { processed: false },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let processed = 0;
  let skipped = 0;
  for (const ev of pending) {
    if (!isDue(ev.payload)) {
      skipped++;
      continue;
    }
    const ok = await processEmailAutomationEvent(ev.id);
    if (ok) processed++;
  }

  const inactive3 = await queueInactiveUserEmails(3, "inactive_3_days");
  const inactive7 = await queueInactiveUserEmails(7, "inactive_7_days");
  const remindersQueued = await queueDueReminderEmails();

  const scheduledCampaigns = await processScheduledCampaigns();

  return {
    processed: processed + scheduledCampaigns,
    skipped,
    inactive3,
    inactive7,
    remindersQueued,
  };
}

async function queueDueReminderEmails(): Promise<number> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const due = await prisma.reminder.findMany({
    where: {
      status: "pending",
      scheduledAt: { lte: now, gte: windowStart },
    },
    take: 50,
    select: {
      id: true,
      userId: true,
      title: true,
      description: true,
      scheduledAt: true,
    },
  });

  const { onReminderDue } = await import("@/lib/email/automation-triggers");
  const { sanitizeEmailSubject, sanitizeEmailBodyText } = await import("@/lib/email/privacy");
  let n = 0;
  for (const r of due) {
    await onReminderDue(
      r.userId,
      r.id,
      sanitizeEmailSubject(r.title),
      sanitizeEmailBodyText(r.description || "You have a health reminder."),
      r.scheduledAt
    );
    n++;
  }
  return n;
}

async function queueInactiveUserEmails(
  days: number,
  eventType: AutomationEventType
): Promise<number> {
  const cutoff = new Date(Date.now() - days * 24 * 3600 * 1000);
  const users = await prisma.user.findMany({
    where: {
      emailVerified: true,
      updatedAt: { lt: cutoff },
    },
    take: 100,
    select: { id: true },
  });

  let n = 0;
  for (const u of users) {
    const key = `inactive_${days}d_${u.id}_${new Date().toISOString().slice(0, 7)}`;
    const exists = await prisma.emailAutomationEvent.findFirst({
      where: {
        userId: u.id,
        eventType,
        payload: { path: ["idempotencyKey"], equals: key },
      },
    });
    if (exists) continue;
    await prisma.emailAutomationEvent.create({
      data: {
        userId: u.id,
        eventType,
        payload: { idempotencyKey: key },
      },
    });
    n++;
  }
  return n;
}

async function processScheduledCampaigns(): Promise<number> {
  if (process.env.EMAIL_MARKETING_ENABLED !== "true") return 0;

  const due = await prisma.emailCampaign.findMany({
    where: {
      status: "scheduled",
      scheduledAt: { lte: new Date() },
    },
    take: 5,
  });

  let sent = 0;
  for (const campaign of due) {
    const { sendCampaign } = await import("@/lib/email/campaign-service");
    await sendCampaign(campaign.id);
    sent++;
  }
  return sent;
}
