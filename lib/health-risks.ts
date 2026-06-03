import prisma from "@/lib/prisma";
import type { AbnormalValue, RiskFlag } from "@/types";

export interface HealthRiskCard {
  id: string;
  title: string;
  level: "info" | "warning" | "critical";
  message: string;
  familyMember: { id: string; fullName: string; relation: string } | null;
  evidence: string[];
  actions: { label: string; href: string }[];
}

const SUGAR_KEYWORDS = ["sugar", "glucose", "hba1c", "hb a1c", "blood sugar"];
const BP_KEYWORDS = ["blood pressure", "bp", "systolic", "diastolic"];

const DEFAULT_FLAG_MESSAGE =
  "Report contains a health flag that may need attention.";

function matchesKeywords(text: string, keywords: string[]) {
  const t = text.toLowerCase();
  return keywords.some((k) => t.includes(k));
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeSeverity(
  value: unknown
): AbnormalValue["severity"] {
  if (
    value === "low" ||
    value === "moderate" ||
    value === "high" ||
    value === "critical"
  ) {
    return value;
  }
  return "unknown";
}

function normalizeAbnormalValues(raw: unknown): AbnormalValue[] {
  return asArray<Partial<AbnormalValue>>(raw)
    .map((item) => ({
      name: typeof item?.name === "string" ? item.name : "",
      value: typeof item?.value === "string" ? item.value : String(item?.value ?? ""),
      normalRange:
        typeof item?.normalRange === "string" ? item.normalRange : "",
      severity: normalizeSeverity(item?.severity),
      meaning: typeof item?.meaning === "string" ? item.meaning : "",
    }))
    .filter((item) => item.name.trim().length > 0);
}

function normalizeRiskLevel(value: unknown): RiskFlag["level"] {
  if (value === "critical" || value === "warning" || value === "info") {
    return value;
  }
  return "info";
}

function normalizeRiskFlags(raw: unknown): RiskFlag[] {
  return asArray<Partial<RiskFlag>>(raw).map((flag) => {
    const message =
      typeof flag?.message === "string" && flag.message.trim()
        ? flag.message.trim()
        : DEFAULT_FLAG_MESSAGE;
    return { level: normalizeRiskLevel(flag?.level), message };
  });
}

function flagCardId(
  memberId: string,
  reportId: string,
  message: string,
  index: number
) {
  const slug = message.slice(0, 20).replace(/\s+/g, "-") || "flag";
  return `flag-${memberId}-${reportId}-${slug}-${index}`;
}

export async function buildHealthRiskCards(
  userId: string,
  familyMemberId?: string | null
): Promise<HealthRiskCard[]> {
  const cards: HealthRiskCard[] = [];
  const memberWhere = familyMemberId
    ? { id: familyMemberId, userId }
    : { userId };

  const members = await prisma.familyMember.findMany({
    where: memberWhere,
    select: { id: true, fullName: true, relation: true },
  });

  for (const member of members) {
    const reports = await prisma.report.findMany({
      where: {
        userId,
        document: { familyMemberId: member.id },
      },
      include: {
        document: { select: { originalFilename: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    for (const report of reports) {
      try {
        const abnormal = normalizeAbnormalValues(report.abnormalValues);
        const flags = normalizeRiskFlags(report.riskFlags);

        const sugarHits = abnormal.filter((a) =>
          matchesKeywords(`${a.name} ${a.value}`, SUGAR_KEYWORDS)
        );
        if (sugarHits.length > 0) {
          cards.push({
            id: `sugar-${member.id}-${report.id}`,
            title: "Blood Sugar",
            level: sugarHits.some(
              (s) => s.severity === "high" || s.severity === "critical"
            )
              ? "warning"
              : "info",
            message: `Recent report values for ${member.fullName} may need attention based on your saved data.`,
            familyMember: member,
            evidence: sugarHits.map((s) => `${s.name}: ${s.value}`),
            actions: [
              { label: "Review latest report", href: `/reports/${report.id}` },
              { label: "Track vitals", href: `/family/${member.id}` },
              { label: "Lab test library", href: "/lab-tests" },
            ],
          });
        }

        const bpHits = abnormal.filter((a) =>
          matchesKeywords(`${a.name} ${a.value}`, BP_KEYWORDS)
        );
        if (bpHits.length > 0) {
          cards.push({
            id: `bp-${member.id}-${report.id}`,
            title: "Blood Pressure",
            level: "warning",
            message: `Blood pressure-related values in a recent report for ${member.fullName} may be worth discussing with a doctor.`,
            familyMember: member,
            evidence: bpHits.map((s) => `${s.name}: ${s.value}`),
            actions: [
              { label: "Review report", href: `/reports/${report.id}` },
              { label: "Log vitals", href: `/family/${member.id}` },
            ],
          });
        }

        flags
          .filter((f) => f.level !== "info")
          .slice(0, 2)
          .forEach((flag, index) => {
          cards.push({
            id: flagCardId(member.id, report.id, flag.message, index),
            title: "Report Flag",
            level: flag.level === "critical" ? "critical" : "warning",
            message: flag.message,
            familyMember: member,
            evidence: [
              report.document?.originalFilename || "Uploaded report",
            ],
            actions: [{ label: "View report", href: `/reports/${report.id}` }],
          });
        });
      } catch (err) {
        console.warn("Skipping malformed report for health risks:", report.id, err);
      }
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const vitalCount = await prisma.vitalRecord.count({
      where: {
        userId,
        familyMemberId: member.id,
        measuredAt: { gte: thirtyDaysAgo },
      },
    });
    if (vitalCount === 0) {
      cards.push({
        id: `no-vitals-${member.id}`,
        title: "Vitals Tracking",
        level: "info",
        message: `No vitals recorded in the last 30 days for ${member.fullName}. Regular tracking can help you spot trends.`,
        familyMember: member,
        evidence: [],
        actions: [{ label: "Add vitals", href: `/family/${member.id}` }],
      });
    }

    const missedMeds = await prisma.medication.count({
      where: {
        userId,
        familyMemberId: member.id,
        status: "active",
        missedDoseCount: { gte: 3 },
      },
    });
    if (missedMeds > 0) {
      cards.push({
        id: `missed-meds-${member.id}`,
        title: "Medication Adherence",
        level: "warning",
        message: `${member.fullName} has medications with multiple missed doses recorded.`,
        familyMember: member,
        evidence: [`${missedMeds} medication(s) with missed doses`],
        actions: [
          { label: "View medications", href: `/family/${member.id}` },
          { label: "Reminders", href: "/reminders" },
        ],
      });
    }

    const upcoming = await prisma.appointment.count({
      where: {
        userId,
        familyMemberId: member.id,
        status: "upcoming",
        appointmentAt: { gte: new Date() },
      },
    });
    if (upcoming > 0) {
      cards.push({
        id: `appt-${member.id}`,
        title: "Upcoming Visits",
        level: "info",
        message: `${member.fullName} has ${upcoming} upcoming appointment(s).`,
        familyMember: member,
        evidence: [],
        actions: [{ label: "View visits", href: `/family/${member.id}` }],
      });
    }
  }

  const pendingReports = await prisma.document.count({
    where: {
      userId,
      uploadStatus: "text_extracted",
      ...(familyMemberId ? { familyMemberId } : {}),
    },
  });
  if (pendingReports > 0) {
    cards.push({
      id: "pending-ai",
      title: "Reports Awaiting Summary",
      level: "info",
      message: `You have ${pendingReports} report(s) ready for AI summary.`,
      familyMember: null,
      evidence: [],
      actions: [{ label: "Upload & process", href: "/upload" }],
    });
  }

  const failedDocs = await prisma.document.count({
    where: { userId, uploadStatus: "failed" },
  });
  if (failedDocs >= 2) {
    cards.push({
      id: "failed-extractions",
      title: "Upload Issues",
      level: "warning",
      message: `${failedDocs} documents failed processing. You may want to re-upload clearer copies.`,
      familyMember: null,
      evidence: [],
      actions: [{ label: "Upload", href: "/upload" }],
    });
  }

  const seen = new Set<string>();
  return cards.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}
