import prisma from "@/lib/prisma";
import { isSmtpConfigured } from "@/lib/email/provider";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getEmailAdminStats() {
  const today = startOfToday();

  const [
    sentToday,
    failedToday,
    queued,
    unsubscribed,
    marketingOptIn,
    newsletterOptIn,
    recentLogs,
  ] = await Promise.all([
    prisma.emailLog.count({
      where: { createdAt: { gte: today }, status: "sent" },
    }),
    prisma.emailLog.count({
      where: { createdAt: { gte: today }, status: "failed" },
    }),
    prisma.emailLog.count({ where: { status: "queued" } }),
    prisma.emailPreference.count({ where: { unsubscribedAt: { not: null } } }),
    prisma.emailPreference.count({ where: { marketingEnabled: true } }),
    prisma.emailPreference.count({ where: { newsletterEnabled: true } }),
    prisma.emailLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        to: true,
        subject: true,
        type: true,
        category: true,
        status: true,
        createdAt: true,
        sentAt: true,
        error: true,
      },
    }),
  ]);

  return {
    smtpConfigured: isSmtpConfigured(),
    dnsNote:
      "Configure SPF, DKIM, and DMARC for support@vaidya-gpt.com before high-volume sending.",
    sentToday,
    failedToday,
    pendingQueue: queued,
    unsubscribedUsers: unsubscribed,
    marketingOptInCount: marketingOptIn,
    newsletterOptInCount: newsletterOptIn,
    recentLogs,
  };
}
