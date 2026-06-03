import prisma from "@/lib/prisma";
import { buildHealthRiskCards } from "@/lib/health-risks";
import { hasHealthRiskDelegate, getStaleClientWarning } from "@/lib/prisma-delegate-guards";
import type { HealthRiskCard } from "@/types";

function mapDbRiskToCard(
  row: {
    id: string;
    category: string;
    title: string;
    level: string;
    message: string;
    evidence: unknown;
    suggestedActions: unknown;
    status: string;
    reportId: string | null;
    documentId: string | null;
    familyMember: { id: string; fullName: string; relation: string } | null;
  }
): HealthRiskCard {
  const evidence = Array.isArray(row.evidence)
    ? (row.evidence as { label?: string; value?: string }[]).map(
        (e) => `${e.label || "Finding"}: ${e.value || "—"}`
      )
    : [];

  const actions: { label: string; href: string }[] = [];
  if (row.reportId) {
    actions.push({ label: "View report", href: `/reports/${row.reportId}` });
  }
  if (row.documentId) {
    actions.push({ label: "View document", href: `/documents/${row.documentId}` });
  }
  if (Array.isArray(row.suggestedActions)) {
    for (const s of row.suggestedActions as string[]) {
      if (typeof s === "string") actions.push({ label: s, href: "/health-risks" });
    }
  }

  return {
    id: row.id,
    category: row.category,
    title: row.title,
    level: row.level as HealthRiskCard["level"],
    message: row.message,
    status: row.status,
    reportId: row.reportId,
    documentId: row.documentId,
    familyMember: row.familyMember,
    evidence,
    suggestedActions: Array.isArray(row.suggestedActions)
      ? (row.suggestedActions as string[])
      : [],
    actions,
  };
}

export async function queryHealthRisks(params: {
  userId: string;
  familyMemberId?: string | null;
  category?: string | null;
  level?: string | null;
  status?: string | null;
  source?: string | null;
  reportId?: string | null;
  limit?: number;
}) {
  if (!hasHealthRiskDelegate()) {
    const supplemental = await buildHealthRiskCards(
      params.userId,
      params.familyMemberId ?? undefined
    ).catch(() => [] as HealthRiskCard[]);
    const cards = supplemental.filter(
      (s) =>
        s.id.startsWith("pending-") ||
        s.id.startsWith("no-vitals") ||
        s.id.startsWith("missed-") ||
        s.id.startsWith("failed-") ||
        s.id.startsWith("appt-")
    );
    return {
      cards,
      stats: {
        total: cards.length,
        critical: cards.filter((c) => c.level === "critical").length,
        warning: cards.filter((c) => c.level === "warning").length,
        info: cards.filter((c) => c.level === "info").length,
      },
      warning: getStaleClientWarning(),
    };
  }

  const status = params.status || "active";
  const where: Record<string, unknown> = {
    userId: params.userId,
    status,
  };
  if (params.familyMemberId) where.familyMemberId = params.familyMemberId;
  if (params.category) where.category = params.category;
  if (params.level) where.level = params.level;
  if (params.source) where.source = params.source;
  if (params.reportId) where.reportId = params.reportId;

  const rows = await prisma.healthRisk.findMany({
    where,
    include: {
      familyMember: {
        select: { id: true, fullName: true, relation: true },
      },
    },
    orderBy: [{ level: "desc" }, { detectedAt: "desc" }],
    take: params.limit ?? 100,
  });

  const cards = rows.map(mapDbRiskToCard);

  if (!params.reportId) {
    const supplemental = await buildHealthRiskCards(
      params.userId,
      params.familyMemberId
    );
    for (const s of supplemental) {
      if (
        s.id.startsWith("pending-") ||
        s.id.startsWith("no-vitals") ||
        s.id.startsWith("missed-") ||
        s.id.startsWith("failed-") ||
        s.id.startsWith("appt-")
      ) {
        cards.push(s);
      }
    }
  }

  const stats = {
    total: cards.length,
    critical: cards.filter((c) => c.level === "critical").length,
    warning: cards.filter((c) => c.level === "warning").length,
    info: cards.filter((c) => c.level === "info").length,
  };

  return { cards, stats, warning: undefined as string | undefined };
}

export async function getRisksForReport(userId: string, reportId: string) {
  if (!hasHealthRiskDelegate()) return [];
  const rows = await prisma.healthRisk.findMany({
    where: { userId, reportId, status: "active" },
    include: {
      familyMember: { select: { id: true, fullName: true, relation: true } },
    },
    orderBy: { detectedAt: "desc" },
  });
  return rows.map(mapDbRiskToCard);
}
