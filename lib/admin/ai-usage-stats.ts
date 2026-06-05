import prisma from "@/lib/prisma";
import { hasAiUsageLogDelegate } from "@/lib/prisma-delegate-guards";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getAiUsageStats() {
  if (!hasAiUsageLogDelegate()) {
    return {
      available: false,
      message: "Run npx prisma migrate dev --name ai_token_optimization and prisma generate",
    };
  }

  const today = startOfToday();
  const month = startOfMonth();

  const [todayAgg, monthAgg, byFeature, byUser, cacheHits, localAnswers, totalCalls, rawFallback] =
    await Promise.all([
      prisma.aiUsageLog.aggregate({
        where: { createdAt: { gte: today }, cached: false, source: "openai" },
        _sum: { totalTokens: true },
      }),
      prisma.aiUsageLog.aggregate({
        where: { createdAt: { gte: month }, cached: false, source: "openai" },
        _sum: { totalTokens: true },
      }),
      prisma.aiUsageLog.groupBy({
        by: ["feature"],
        where: { createdAt: { gte: month } },
        _sum: { totalTokens: true },
        _count: { id: true },
      }),
      prisma.aiUsageLog.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: month }, userId: { not: null } },
        _sum: { totalTokens: true },
        _count: { id: true },
        orderBy: { _sum: { totalTokens: "desc" } },
        take: 10,
      }),
      prisma.aiUsageLog.count({
        where: { createdAt: { gte: month }, cached: true },
      }),
      prisma.aiUsageLog.count({
        where: { createdAt: { gte: month }, source: "local" },
      }),
      prisma.aiUsageLog.count({ where: { createdAt: { gte: month } } }),
      prisma.aiUsageLog.count({
        where: { createdAt: { gte: month }, feature: "summary", source: "openai" },
      }),
    ]);

  const summaryCalls = await prisma.aiUsageLog.count({
    where: { createdAt: { gte: month }, feature: "summary" },
  });
  const chatCalls = await prisma.aiUsageLog.count({
    where: { createdAt: { gte: month }, feature: { startsWith: "chat" } },
  });
  const summaryTokens = await prisma.aiUsageLog.aggregate({
    where: { createdAt: { gte: month }, feature: "summary", source: "openai" },
    _avg: { totalTokens: true },
  });
  const chatTokens = await prisma.aiUsageLog.aggregate({
    where: {
      createdAt: { gte: month },
      feature: { startsWith: "chat" },
      source: "openai",
    },
    _avg: { totalTokens: true },
  });

  const topReports = await prisma.aiUsageLog.groupBy({
    by: ["reportId"],
    where: { createdAt: { gte: month }, reportId: { not: null }, source: "openai" },
    _sum: { totalTokens: true },
    orderBy: { _sum: { totalTokens: "desc" } },
    take: 10,
  });

  return {
    available: true,
    tokensToday: todayAgg._sum.totalTokens ?? 0,
    tokensThisMonth: monthAgg._sum.totalTokens ?? 0,
    tokensByFeature: byFeature.map((r) => ({
      feature: r.feature,
      tokens: r._sum.totalTokens ?? 0,
      calls: r._count.id,
    })),
    tokensByUser: byUser.map((r) => ({
      userId: r.userId,
      tokens: r._sum.totalTokens ?? 0,
      calls: r._count.id,
    })),
    cacheHitRate: totalCalls > 0 ? Math.round((cacheHits / totalCalls) * 100) : 0,
    localAnswersCount: localAnswers,
    topExpensiveReports: topReports.map((r) => ({
      reportId: r.reportId,
      tokens: r._sum.totalTokens ?? 0,
    })),
    avgTokensPerSummary: Math.round(summaryTokens._avg.totalTokens ?? 0),
    avgTokensPerChat: Math.round(chatTokens._avg.totalTokens ?? 0),
    summaryCallsThisMonth: summaryCalls,
    chatCallsThisMonth: chatCalls,
    rawTextFallbackUsage: rawFallback,
  };
}
