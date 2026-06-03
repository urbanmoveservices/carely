import prisma from "@/lib/prisma";
import type { SearchResultItem } from "@/types";

export type SearchType =
  | "all"
  | "documents"
  | "reports"
  | "family"
  | "conditions"
  | "medications"
  | "appointments"
  | "reminders"
  | "vitals"
  | "insights"
  | "health_risks"
  | "lab_trends"
  | "notifications";

export interface SearchParams {
  userId: string;
  q: string;
  type?: SearchType;
  familyMemberId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}

function contains(q: string) {
  return { contains: q, mode: "insensitive" as const };
}

function dateFilter(from?: Date, to?: Date) {
  if (!from && !to) return undefined;
  return {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {}),
  };
}

export async function performSearch(params: SearchParams) {
  const q = params.q.trim();
  const limit = Math.min(params.limit ?? 20, 50);
  const type = params.type ?? "all";
  const memberFilter = params.familyMemberId
    ? { familyMemberId: params.familyMemberId }
    : {};
  const createdRange = dateFilter(params.from, params.to);

  const empty = {
    documents: [] as SearchResultItem[],
    reports: [] as SearchResultItem[],
    familyMembers: [] as SearchResultItem[],
    conditions: [] as SearchResultItem[],
    medications: [] as SearchResultItem[],
    appointments: [] as SearchResultItem[],
    reminders: [] as SearchResultItem[],
    vitals: [] as SearchResultItem[],
    insights: [] as SearchResultItem[],
    healthRisks: [] as SearchResultItem[],
    labTrends: [] as SearchResultItem[],
    notifications: [] as SearchResultItem[],
  };

  if (!q || q.length < 1) {
    return { query: q, results: empty, total: 0 };
  }

  const results = { ...empty };

  const run = (t: SearchType) => type === "all" || type === t;

  if (run("documents")) {
    const docs = await prisma.document.findMany({
      where: {
        userId: params.userId,
        ...memberFilter,
        ...(createdRange ? { createdAt: createdRange } : {}),
        OR: [
          { originalFilename: contains(q) },
          { extractedText: contains(q) },
        ],
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        report: { select: { id: true } },
        familyMember: { select: { id: true, fullName: true, relation: true } },
      },
    });
    results.documents = docs.map((d) => ({
      id: d.id,
      type: "document",
      title: d.originalFilename,
      subtitle: d.familyMember
        ? `${d.familyMember.fullName} (${d.familyMember.relation})`
        : "Myself",
      date: d.createdAt.toISOString(),
      href: `/documents/${d.id}`,
      badge: d.uploadStatus,
    }));
  }

  if (run("reports")) {
    const reportWhere = {
      userId: params.userId,
      ...(createdRange ? { createdAt: createdRange } : {}),
      summary: contains(q),
      ...(params.familyMemberId
        ? { document: { familyMemberId: params.familyMemberId } }
        : {}),
    };
    const reports = await prisma.report.findMany({
      where: reportWhere,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        document: {
          select: {
            id: true,
            originalFilename: true,
            familyMember: { select: { id: true, fullName: true, relation: true } },
          },
        },
      },
    });

    const extraReports = await prisma.report.findMany({
      where: {
        userId: params.userId,
        ...(params.familyMemberId
          ? { document: { familyMemberId: params.familyMemberId } }
          : {}),
        ...(createdRange ? { createdAt: createdRange } : {}),
        NOT: { id: { in: reports.map((r) => r.id) } },
      },
      take: limit * 2,
      orderBy: { createdAt: "desc" },
      include: {
        document: {
          select: {
            id: true,
            originalFilename: true,
            familyMember: { select: { id: true, fullName: true, relation: true } },
          },
        },
      },
    });

    const ql = q.toLowerCase();
    const jsonMatches = extraReports.filter((r) => {
      const kf = JSON.stringify(r.keyFindings).toLowerCase();
      const av = JSON.stringify(r.abnormalValues).toLowerCase();
      return kf.includes(ql) || av.includes(ql);
    });

    const merged = [...reports, ...jsonMatches].slice(0, limit);
    results.reports = merged.map((r) => ({
      id: r.id,
      type: "report",
      title: r.document.originalFilename,
      subtitle: r.summary.slice(0, 120),
      date: r.createdAt.toISOString(),
      href: `/reports/${r.id}`,
      badge: "ai_completed",
      familyMemberId: r.document.familyMember?.id ?? null,
    }));
  }

  if (run("family")) {
    const members = await prisma.familyMember.findMany({
      where: {
        userId: params.userId,
        OR: [{ fullName: contains(q) }, { relation: contains(q) }, { notes: contains(q) }],
      },
      take: limit,
      orderBy: { fullName: "asc" },
    });
    results.familyMembers = members.map((m) => ({
      id: m.id,
      type: "family",
      title: m.fullName,
      subtitle: m.relation,
      date: m.createdAt.toISOString(),
      href: `/family/${m.id}`,
    }));
  }

  if (run("conditions")) {
    const [conditions, allergies] = await Promise.all([
      prisma.healthCondition.findMany({
        where: {
          userId: params.userId,
          ...memberFilter,
          ...(createdRange ? { createdAt: createdRange } : {}),
          OR: [{ name: contains(q) }, { notes: contains(q) }],
        },
        take: limit,
        include: { familyMember: { select: { id: true, fullName: true } } },
      }),
      prisma.allergy.findMany({
        where: {
          userId: params.userId,
          ...memberFilter,
          OR: [{ name: contains(q) }, { reaction: contains(q) }],
        },
        take: limit,
        include: { familyMember: { select: { id: true, fullName: true } } },
      }),
    ]);
    results.conditions = [
      ...conditions.map((c) => ({
        id: c.id,
        type: "condition",
        title: c.name,
        subtitle: `${c.status}${c.familyMember ? ` · ${c.familyMember.fullName}` : ""}`,
        date: c.createdAt.toISOString(),
        href: `/family/${c.familyMemberId}`,
        badge: c.status,
      })),
      ...allergies.map((a) => ({
        id: a.id,
        type: "allergy",
        title: a.name,
        subtitle: `Allergy${a.familyMember ? ` · ${a.familyMember.fullName}` : ""}`,
        date: a.createdAt.toISOString(),
        href: `/family/${a.familyMemberId}`,
        badge: a.severity ?? "allergy",
      })),
    ].slice(0, limit);
  }

  if (run("medications")) {
    const meds = await prisma.medication.findMany({
      where: {
        userId: params.userId,
        ...memberFilter,
        OR: [{ name: contains(q) }, { dosage: contains(q) }, { frequency: contains(q) }],
      },
      take: limit,
      include: { familyMember: { select: { id: true, fullName: true } } },
    });
    results.medications = meds.map((m) => ({
      id: m.id,
      type: "medication",
      title: m.name,
      subtitle: [m.dosage, m.familyMember?.fullName].filter(Boolean).join(" · "),
      date: m.createdAt.toISOString(),
      href: `/family/${m.familyMemberId}`,
      badge: m.status,
    }));
  }

  if (run("appointments")) {
    const appts = await prisma.appointment.findMany({
      where: {
        userId: params.userId,
        ...memberFilter,
        ...(createdRange ? { appointmentAt: createdRange } : {}),
        OR: [
          { title: contains(q) },
          { doctorName: contains(q) },
          { hospitalName: contains(q) },
        ],
      },
      take: limit,
      include: { familyMember: { select: { id: true, fullName: true } } },
    });
    results.appointments = appts.map((a) => ({
      id: a.id,
      type: "appointment",
      title: a.title,
      subtitle: [a.doctorName, a.familyMember?.fullName].filter(Boolean).join(" · "),
      date: a.appointmentAt.toISOString(),
      href: `/family/${a.familyMemberId}`,
      badge: a.status,
    }));
  }

  if (run("reminders")) {
    const reminders = await prisma.reminder.findMany({
      where: {
        userId: params.userId,
        ...memberFilter,
        ...(createdRange ? { scheduledAt: createdRange } : {}),
        OR: [{ title: contains(q) }, { description: contains(q) }],
      },
      take: limit,
      include: { familyMember: { select: { id: true, fullName: true } } },
    });
    results.reminders = reminders.map((r) => ({
      id: r.id,
      type: "reminder",
      title: r.title,
      subtitle: r.familyMember?.fullName ?? r.type,
      date: r.scheduledAt.toISOString(),
      href: `/reminders/${r.id}/edit`,
      badge: r.status,
    }));

    const reminderSuggestions = await prisma.reminderSuggestion.findMany({
      where: {
        userId: params.userId,
        ...memberFilter,
        OR: [{ title: contains(q) }, { message: contains(q) }],
      },
      take: Math.floor(limit / 2),
      orderBy: { createdAt: "desc" },
    });
    for (const s of reminderSuggestions) {
      results.reminders.push({
        id: s.id,
        type: "reminder_suggestion",
        title: s.title,
        subtitle: s.message.slice(0, 80),
        date: s.createdAt.toISOString(),
        href: s.reportId ? `/reports/${s.reportId}` : "/dashboard",
        badge: s.status,
      });
    }
  }

  if (run("insights")) {
    const insights = await prisma.healthInsight.findMany({
      where: {
        userId: params.userId,
        ...memberFilter,
        ...(createdRange ? { createdAt: createdRange } : {}),
        OR: [{ title: contains(q) }, { message: contains(q) }],
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });
    results.insights = insights.map((i) => ({
      id: i.id,
      type: "insight",
      title: i.title,
      subtitle: i.message.slice(0, 120),
      date: i.createdAt.toISOString(),
      href: "/insights",
      badge: i.severity,
    }));
  }

  if (run("health_risks")) {
    const risks = await prisma.healthRisk.findMany({
      where: {
        userId: params.userId,
        ...memberFilter,
        OR: [{ title: contains(q) }, { message: contains(q) }, { category: contains(q) }],
      },
      take: limit,
      orderBy: { detectedAt: "desc" },
    });
    results.healthRisks = risks.map((r) => ({
      id: r.id,
      type: "health_risk",
      title: r.title,
      subtitle: r.message.slice(0, 120),
      date: r.detectedAt.toISOString(),
      href: r.reportId ? `/reports/${r.reportId}` : "/health-risks",
      badge: r.level,
    }));
  }

  if (run("lab_trends")) {
    const trends = await prisma.labTrendRecord.findMany({
      where: {
        userId: params.userId,
        ...memberFilter,
        OR: [{ markerName: contains(q) }, { markerKey: contains(q) }],
      },
      take: limit,
      orderBy: { measuredAt: "desc" },
    });
    results.labTrends = trends.map((t) => ({
      id: t.id,
      type: "lab_trend",
      title: t.markerName,
      subtitle: t.value != null ? `${t.value} ${t.unit || ""}`.trim() : "—",
      date: (t.measuredAt || t.createdAt).toISOString(),
      href: t.reportId ? `/reports/${t.reportId}` : "/insights",
      badge: t.status || undefined,
    }));
  }

  if (run("notifications")) {
    const notifs = await prisma.appNotification.findMany({
      where: {
        userId: params.userId,
        OR: [{ title: contains(q) }, { message: contains(q) }],
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });
    results.notifications = notifs.map((n) => ({
      id: n.id,
      type: "notification",
      title: n.title,
      subtitle: n.message.slice(0, 120),
      date: n.createdAt.toISOString(),
      href: n.href || "/notifications",
      badge: n.isRead ? "read" : "unread",
    }));
  }

  if (run("vitals")) {
    const vitals = await prisma.vitalRecord.findMany({
      where: {
        userId: params.userId,
        ...memberFilter,
        ...(createdRange ? { measuredAt: createdRange } : {}),
        OR: [{ label: contains(q) }, { type: contains(q) }, { valueText: contains(q) }],
      },
      take: limit,
      include: { familyMember: { select: { id: true, fullName: true } } },
    });
    results.vitals = vitals.map((v) => ({
      id: v.id,
      type: "vital",
      title: v.label,
      subtitle: [
        v.value != null ? `${v.value} ${v.unit || ""}`.trim() : v.valueText,
        v.familyMember?.fullName,
      ]
        .filter(Boolean)
        .join(" · "),
      date: v.measuredAt.toISOString(),
      href: `/family/${v.familyMemberId}`,
      badge: v.type,
    }));
  }

  const total = Object.values(results).reduce((s, arr) => s + arr.length, 0);
  return { query: q, results, total };
}
