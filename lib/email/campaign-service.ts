import prisma from "@/lib/prisma";
import { sendTemplatedEmail } from "@/lib/email/send-templated";
import { getOrCreateEmailPreference } from "@/lib/email/preferences";
import type { EmailTemplateKey } from "@/lib/email/template-keys";

export type CampaignSegment =
  | "all_verified"
  | "free_users"
  | "pro_users"
  | "family_users"
  | "inactive_users"
  | "no_upload"
  | "summary_completed"
  | "marketing_opt_in"
  | "newsletter_opt_in";

const BATCH = parseInt(process.env.EMAIL_BATCH_SIZE || "100", 10);

export async function resolveSegmentUsers(segment: CampaignSegment): Promise<
  Array<{ id: string; email: string; name: string | null }>
> {
  const base = { emailVerified: true };
  switch (segment) {
    case "free_users":
      return prisma.user.findMany({
        where: { ...base, currentPlan: "free" },
        select: { id: true, email: true, name: true },
        take: 5000,
      });
    case "pro_users":
      return prisma.user.findMany({
        where: { ...base, currentPlan: "pro" },
        select: { id: true, email: true, name: true },
        take: 5000,
      });
    case "family_users":
      return prisma.user.findMany({
        where: { ...base, currentPlan: "family" },
        select: { id: true, email: true, name: true },
        take: 5000,
      });
    case "marketing_opt_in":
      return prisma.user.findMany({
        where: {
          ...base,
          emailPreference: { marketingEnabled: true },
        },
        select: { id: true, email: true, name: true },
        take: 5000,
      });
    case "newsletter_opt_in":
      return prisma.user.findMany({
        where: {
          ...base,
          emailPreference: { newsletterEnabled: true },
        },
        select: { id: true, email: true, name: true },
        take: 5000,
      });
    case "no_upload":
      return prisma.user.findMany({
        where: {
          ...base,
          documents: { none: {} },
        },
        select: { id: true, email: true, name: true },
        take: 5000,
      });
    case "inactive_users": {
      const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000);
      return prisma.user.findMany({
        where: { ...base, updatedAt: { lt: cutoff } },
        select: { id: true, email: true, name: true },
        take: 5000,
      });
    }
    case "summary_completed":
      return prisma.user.findMany({
        where: { ...base, reports: { some: {} } },
        select: { id: true, email: true, name: true },
        take: 5000,
      });
    default:
      return prisma.user.findMany({
        where: base,
        select: { id: true, email: true, name: true },
        take: 5000,
      });
  }
}

export async function createCampaignDraft(params: {
  name: string;
  subject: string;
  previewText?: string;
  templateKey: EmailTemplateKey;
  category: "marketing" | "lifecycle";
  segment: CampaignSegment;
  contentJson?: Record<string, unknown>;
  createdById?: string;
}) {
  return prisma.emailCampaign.create({
    data: {
      name: params.name,
      subject: params.subject,
      previewText: params.previewText,
      templateKey: params.templateKey,
      category: params.category,
      segment: { segment: params.segment },
      contentJson: (params.contentJson ?? {}) as object,
      status: "draft",
      createdById: params.createdById,
    },
  });
}

export async function sendCampaignTest(campaignId: string, testEmail: string) {
  const campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error("Campaign not found");
  const content = (campaign.contentJson as Record<string, string>) ?? {};
  return sendTemplatedEmail({
    to: testEmail,
    templateKey: campaign.templateKey as EmailTemplateKey,
    subject: campaign.subject,
    data: {
      ...content,
      body: content.body || campaign.previewText || "",
      preview: campaign.previewText || "",
    },
    skipPreferenceCheck: true,
    includeUnsubscribe: true,
  });
}

export async function sendCampaign(campaignId: string) {
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
    include: { recipients: true },
  });
  if (!campaign) throw new Error("Campaign not found");

  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: { status: "sending" },
  });

  let recipients = campaign.recipients;
  if (!recipients.length) {
    const segment = ((campaign.segment as { segment?: CampaignSegment })?.segment ||
      "marketing_opt_in") as CampaignSegment;
    const users = await resolveSegmentUsers(segment);
    for (const u of users.slice(0, BATCH)) {
      const pref = await getOrCreateEmailPreference(u.id);
      if (campaign.category === "marketing" && !pref.marketingEnabled) continue;
      if (pref.unsubscribedAt) continue;
      await prisma.emailCampaignRecipient.create({
        data: { campaignId, userId: u.id, email: u.email, status: "pending" },
      });
    }
    recipients = await prisma.emailCampaignRecipient.findMany({
      where: { campaignId, status: "pending" },
      take: BATCH,
    });
  }

  const content = (campaign.contentJson as Record<string, string>) ?? {};
  let sent = 0;
  for (const r of recipients) {
    if (r.userId) {
      const pref = await getOrCreateEmailPreference(r.userId);
      if (campaign.category === "marketing" && !pref.marketingEnabled) {
        await prisma.emailCampaignRecipient.update({
          where: { id: r.id },
          data: { status: "skipped", error: "marketing_disabled" },
        });
        continue;
      }
      if (pref.unsubscribedAt) {
        await prisma.emailCampaignRecipient.update({
          where: { id: r.id },
          data: { status: "unsubscribed" },
        });
        continue;
      }
    }

    const result = await sendTemplatedEmail({
      to: r.email,
      userId: r.userId,
      templateKey: campaign.templateKey as EmailTemplateKey,
      subject: campaign.subject,
      data: {
        ...content,
        body: content.body || campaign.previewText || "",
        preview: campaign.previewText || "",
      },
      includeUnsubscribe: true,
    });

    await prisma.emailCampaignRecipient.update({
      where: { id: r.id },
      data: {
        status: result.skipped ? "skipped" : result.ok ? "sent" : "failed",
        sentAt: result.ok && !result.skipped ? new Date() : null,
        error: result.reason || undefined,
      },
    });
    if (result.ok && !result.skipped) sent++;
  }

  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      status: sent > 0 ? "sent" : "draft",
      sentAt: sent > 0 ? new Date() : null,
    },
  });

  return { sent, total: recipients.length };
}
