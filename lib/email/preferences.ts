import prisma from "@/lib/prisma";

export type EmailCategory = "transactional" | "lifecycle" | "marketing";

export type EmailPreferenceData = {
  transactionalEnabled: boolean;
  lifecycleEnabled: boolean;
  marketingEnabled: boolean;
  newsletterEnabled: boolean;
  productUpdatesEnabled: boolean;
  reminderEmailsEnabled: boolean;
  reportEmailsEnabled: boolean;
  billingEmailsEnabled: boolean;
  unsubscribedAt: string | null;
};

const DEFAULTS = {
  transactionalEnabled: true,
  lifecycleEnabled: true,
  marketingEnabled: false,
  newsletterEnabled: false,
  productUpdatesEnabled: false,
  reminderEmailsEnabled: true,
  reportEmailsEnabled: true,
  billingEmailsEnabled: true,
};

export async function getOrCreateEmailPreference(userId: string) {
  const existing = await prisma.emailPreference.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.emailPreference.create({ data: { userId, ...DEFAULTS } });
}

export function serializeEmailPreference(
  row: Awaited<ReturnType<typeof getOrCreateEmailPreference>>
): EmailPreferenceData {
  return {
    transactionalEnabled: row.transactionalEnabled,
    lifecycleEnabled: row.lifecycleEnabled,
    marketingEnabled: row.marketingEnabled,
    newsletterEnabled: row.newsletterEnabled,
    productUpdatesEnabled: row.productUpdatesEnabled,
    reminderEmailsEnabled: row.reminderEmailsEnabled,
    reportEmailsEnabled: row.reportEmailsEnabled,
    billingEmailsEnabled: row.billingEmailsEnabled,
    unsubscribedAt: row.unsubscribedAt?.toISOString() ?? null,
  };
}

export async function canSendEmail(params: {
  userId: string;
  category: EmailCategory;
  templateKey: string;
}): Promise<{ allowed: boolean; reason?: string }> {
  const pref = await getOrCreateEmailPreference(params.userId);

  if (params.category === "transactional") {
    if (!pref.transactionalEnabled) {
      return { allowed: false, reason: "transactional_disabled" };
    }
    if (params.templateKey.startsWith("payment_") && !pref.billingEmailsEnabled) {
      return { allowed: false, reason: "billing_disabled" };
    }
    if (
      (params.templateKey.startsWith("report_") ||
        params.templateKey.startsWith("ai_summary") ||
        params.templateKey === "reminder_due") &&
      !pref.reportEmailsEnabled &&
      params.templateKey !== "email_verification_otp" &&
      params.templateKey !== "password_reset_otp"
    ) {
      if (params.templateKey === "reminder_due" && !pref.reminderEmailsEnabled) {
        return { allowed: false, reason: "reminder_disabled" };
      }
      if (
        params.templateKey.startsWith("report_") ||
        params.templateKey.startsWith("ai_summary")
      ) {
        if (!pref.reportEmailsEnabled) {
          return { allowed: false, reason: "report_disabled" };
        }
      }
    }
    return { allowed: true };
  }

  if (pref.unsubscribedAt) {
    return { allowed: false, reason: "unsubscribed" };
  }

  if (params.category === "lifecycle") {
    if (!pref.lifecycleEnabled) return { allowed: false, reason: "lifecycle_disabled" };
    return { allowed: true };
  }

  if (params.category === "marketing") {
    if (process.env.EMAIL_MARKETING_ENABLED !== "true") {
      return { allowed: false, reason: "marketing_globally_disabled" };
    }
    if (!pref.marketingEnabled) return { allowed: false, reason: "marketing_disabled" };
    if (params.templateKey.includes("newsletter") && !pref.newsletterEnabled) {
      return { allowed: false, reason: "newsletter_disabled" };
    }
    if (params.templateKey.includes("feature") && !pref.productUpdatesEnabled) {
      return { allowed: false, reason: "product_updates_disabled" };
    }
    return { allowed: true };
  }

  return { allowed: true };
}

export async function updateEmailPreference(
  userId: string,
  data: Partial<{
    lifecycleEnabled: boolean;
    marketingEnabled: boolean;
    newsletterEnabled: boolean;
    productUpdatesEnabled: boolean;
    reminderEmailsEnabled: boolean;
    reportEmailsEnabled: boolean;
    billingEmailsEnabled: boolean;
  }>
) {
  await getOrCreateEmailPreference(userId);
  return prisma.emailPreference.update({
    where: { userId },
    data: {
      ...data,
      unsubscribedAt:
        data.marketingEnabled === false &&
        data.lifecycleEnabled === false
          ? new Date()
          : undefined,
    },
  });
}
