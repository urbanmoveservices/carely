import prisma from "@/lib/prisma";
import { computeAge } from "@/lib/profile";
import { resolveReportForUser } from "@/lib/report-resolve";
import { buildContextDigest, extractLabsFromContext, medicineHintsForLabs } from "@/lib/ai/chat-context-digest";
import { loadStructuredLabValues } from "@/lib/lab-value-service";
import { formatStructuredValuesForPrompt } from "@/lib/lab-value-parser";
import { isCompactContextOnly } from "@/lib/ai/model-router";
import { selectRelevantSnippets } from "@/lib/ai/relevant-snippet-selector";

export type ChatSourceRef = {
  type: "report" | "family" | "document" | "risk" | "reminder";
  id: string;
  title: string;
  date?: string;
};

export async function buildReportChatContext(userId: string, reportId: string) {
  const resolved = await resolveReportForUser(userId, reportId);
  if (!resolved) return null;

  const report = await prisma.report.findUnique({ where: { id: resolved.report.id } });
  if (!report) return null;

  const [manualValues, risks, document, reportContext, doctorQs] = await Promise.all([
    prisma.manualLabValue.findMany({
      where: { reportId: report.id, userId },
      take: 25,
      select: { testName: true, value: true, valueText: true, unit: true, status: true },
    }),
    prisma.healthRisk
      .findMany({
        where: { reportId: report.id, userId, status: "active" },
        take: 12,
        select: { id: true, title: true, level: true, message: true },
      })
      .catch(() => []),
    prisma.document.findUnique({
      where: { id: report.documentId },
      select: {
        id: true,
        originalFilename: true,
        familyMemberId: true,
        extractedText: true,
        familyMember: {
          select: { id: true, fullName: true, relation: true, gender: true, bloodGroup: true },
        },
      },
    }),
    prisma.reportContext.findUnique({ where: { documentId: report.documentId } }),
    prisma.doctorQuestionSet.findFirst({
      where: { reportId: report.id, userId },
      orderBy: { createdAt: "desc" },
      select: { questions: true, summary: true },
    }),
  ]);

  const reportMedications = document?.familyMemberId
    ? await prisma.medication.findMany({
        where: {
          userId,
          familyMemberId: document.familyMemberId,
          status: "active",
        },
        take: 20,
        select: { name: true, dosage: true, frequency: true, notes: true },
      })
    : [];

  const sources: ChatSourceRef[] = [
    {
      type: "report",
      id: report.id,
      title: document?.originalFilename || "Medical report",
      date: report.createdAt.toISOString().slice(0, 10),
    },
  ];

  const structuredLabValues = await loadStructuredLabValues({
    userId,
    documentId: report.documentId,
    reportId: report.id,
    extractedText: document?.extractedText ?? "",
    reparseIfEmpty: false,
  });

  const compactOnly = isCompactContextOnly() && structuredLabValues.length >= 3;
  const extractedPreview = compactOnly
    ? selectRelevantSnippets(
        document?.extractedText ?? "",
        structuredLabValues.map((v) => v.testName)
      ) || null
    : document?.extractedText?.slice(0, 2500) ?? null;

  const reportPayload = {
    id: report.id,
    filename: document?.originalFilename,
    date: report.createdAt.toISOString(),
    healthScore: report.healthScore,
    summary: report.summary?.slice(0, 3500),
    keyFindings: report.keyFindings,
    abnormalValues: report.abnormalValues,
    riskFlags: report.riskFlags,
    chartData: report.chartData,
    contextualInsights: report.contextualInsights,
    manualLabValues: manualValues,
    healthRisks: risks,
    doctorQuestions: doctorQs?.questions ?? null,
    questionnaire: reportContext
      ? {
          knownConditions: reportContext.knownConditions,
          allergies: reportContext.allergies,
          symptoms: reportContext.symptoms,
          notes: reportContext.notes?.slice(0, 400),
        }
      : null,
    activeMedications: reportMedications,
    familyMember: document?.familyMember,
    extractedPreview,
    structuredLabBlock: structuredLabValues.length
      ? formatStructuredValuesForPrompt(structuredLabValues)
      : null,
  };

  const labs = extractLabsFromContext({ report: reportPayload });
  const medHints = medicineHintsForLabs(labs);

  return {
    mode: "report",
    sources,
    contextDigest: buildContextDigest({ report: reportPayload }),
    medicineHints: medHints || null,
    report: reportPayload,
    structuredLabValues,
    compactContext: compactOnly,
  };
}

async function loadFamilyScopedData(userId: string, familyMemberId?: string | null) {
  const memberWhere = familyMemberId ? { userId, id: familyMemberId } : { userId };

  const members = await prisma.familyMember.findMany({
    where: memberWhere,
    select: {
      id: true,
      fullName: true,
      relation: true,
      gender: true,
      bloodGroup: true,
      lastReportAt: true,
      lastRiskLevel: true,
    },
  });

  const memberIds = members.map((m) => m.id);

  const reportWhere = familyMemberId
    ? { userId, document: { familyMemberId } }
    : { userId };

  const [reports, reminders, risks, trends, appointments, medications, allergies, conditions, vitals, pendingDocs] =
    await Promise.all([
      prisma.report.findMany({
        where: reportWhere,
        orderBy: { createdAt: "desc" },
        take: familyMemberId ? 5 : 15,
        select: {
          id: true,
          summary: true,
          healthScore: true,
          createdAt: true,
          abnormalValues: true,
          document: { select: { familyMemberId: true, originalFilename: true } },
        },
      }),
      prisma.reminder.findMany({
        where: {
          userId,
          status: "pending",
          ...(familyMemberId ? { familyMemberId } : {}),
        },
        orderBy: { scheduledAt: "asc" },
        take: 15,
        select: { id: true, title: true, scheduledAt: true, familyMemberId: true },
      }),
      prisma.healthRisk
        .findMany({
          where: {
            userId,
            status: "active",
            ...(familyMemberId ? { familyMemberId } : {}),
          },
          take: 20,
          select: { id: true, title: true, level: true, message: true, familyMemberId: true, reportId: true },
        })
        .catch(() => []),
      prisma.labTrendRecord
        .findMany({
          where: {
            userId,
            ...(familyMemberId ? { familyMemberId } : {}),
          },
          orderBy: { measuredAt: "desc" },
          take: 20,
          select: {
            testName: true,
            markerKey: true,
            value: true,
            unit: true,
            status: true,
            measuredAt: true,
            familyMemberId: true,
          },
        })
        .catch(() => []),
      prisma.appointment
        .findMany({
          where: { userId, ...(familyMemberId ? { familyMemberId } : {}) },
          orderBy: { appointmentAt: "asc" },
          take: 10,
          select: { title: true, appointmentAt: true, familyMemberId: true, status: true },
        })
        .catch(() => []),
      prisma.medication.findMany({
        where: {
          userId,
          status: "active",
          ...(familyMemberId && memberIds.length ? { familyMemberId: { in: memberIds } } : {}),
        },
        take: 25,
        select: { name: true, dosage: true, familyMemberId: true },
      }),
      prisma.allergy.findMany({
        where: {
          userId,
          ...(familyMemberId && memberIds.length ? { familyMemberId: { in: memberIds } } : {}),
        },
        take: 20,
        select: { name: true, severity: true, familyMemberId: true },
      }),
      prisma.healthCondition.findMany({
        where: {
          userId,
          status: "active",
          ...(familyMemberId && memberIds.length ? { familyMemberId: { in: memberIds } } : {}),
        },
        take: 20,
        select: { name: true, familyMemberId: true },
      }),
      familyMemberId
        ? prisma.vitalRecord
            .findMany({
              where: { userId, familyMemberId },
              orderBy: { measuredAt: "desc" },
              take: 8,
              select: { type: true, value: true, unit: true, measuredAt: true },
            })
            .catch(() => [])
        : Promise.resolve([]),
      prisma.document.findMany({
        where: {
          userId,
          uploadStatus: "text_extracted",
          report: { is: null },
          ...(familyMemberId ? { familyMemberId } : {}),
        },
        take: 10,
        select: { id: true, originalFilename: true, createdAt: true, familyMemberId: true },
      }),
    ]);

  const sources: ChatSourceRef[] = reports.slice(0, 5).map((r) => ({
    type: "report" as const,
    id: r.id,
    title: r.document.originalFilename,
    date: r.createdAt.toISOString().slice(0, 10),
  }));

  return {
    familyMembers: members,
    recentReports: reports.map((r) => ({
      id: r.id,
      title: r.document.originalFilename,
      date: r.createdAt.toISOString().slice(0, 10),
      memberId: r.document.familyMemberId,
      healthScore: r.healthScore,
      summary: r.summary?.slice(0, 500),
      abnormalValues: r.abnormalValues,
    })),
    pendingReminders: reminders,
    activeHealthRisks: risks,
    labTrends: trends,
    appointments,
    activeMedications: medications,
    allergies,
    conditions,
    recentVitals: vitals,
    pendingSummaryDocuments: pendingDocs.map((d) => ({
      id: d.id,
      filename: d.originalFilename,
      date: d.createdAt.toISOString().slice(0, 10),
      familyMemberId: d.familyMemberId,
    })),
    sources,
  };
}

export async function buildFamilyChatContext(
  userId: string,
  familyMemberId?: string | null
) {
  if (familyMemberId) {
    const member = await prisma.familyMember.findFirst({
      where: { id: familyMemberId, userId },
    });
    if (!member) return null;
  }

  const data = await loadFamilyScopedData(userId, familyMemberId);
  return { mode: "family", ...data };
}

export async function buildGeneralChatContext(userId: string) {
  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      gender: true,
      dateOfBirth: true,
      bloodGroup: true,
      knownConditionsSummary: true,
      allergiesSummary: true,
      currentMedicationsSummary: true,
    },
  });

  const familyData = await loadFamilyScopedData(userId, null);

  const latestReport = await prisma.report.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      summary: true,
      healthScore: true,
      keyFindings: true,
      abnormalValues: true,
      manualLabValues: {
        take: 25,
        select: { testName: true, value: true, valueText: true, unit: true, status: true },
      },
      document: { select: { originalFilename: true } },
    },
  });

  const latestPayload = latestReport
    ? {
        id: latestReport.id,
        filename: latestReport.document.originalFilename,
        summary: latestReport.summary?.slice(0, 3500),
        healthScore: latestReport.healthScore,
        keyFindings: latestReport.keyFindings,
        abnormalValues: latestReport.abnormalValues,
        manualLabValues: latestReport.manualLabValues,
      }
    : null;

  const labs = latestPayload ? extractLabsFromContext({ report: latestPayload }) : [];
  const medHints = medicineHintsForLabs(labs);

  return {
    mode: "general",
    accountHolder: account
      ? {
          name: account.name,
          age: computeAge(account.dateOfBirth),
          gender: account.gender,
          bloodGroup: account.bloodGroup,
          conditionsSummary: account.knownConditionsSummary,
          allergiesSummary: account.allergiesSummary,
          medicationsSummary: account.currentMedicationsSummary,
        }
      : null,
    latestReport: latestPayload,
    contextDigest: latestPayload
      ? buildContextDigest({ report: latestPayload })
      : buildContextDigest(familyData as Record<string, unknown>),
    medicineHints: medHints || null,
    ...familyData,
  };
}
