import prisma from "@/lib/prisma";
import { computeAge } from "@/lib/profile";
import { resolveReportForUser } from "@/lib/report-resolve";

export async function buildReportChatContext(userId: string, reportId: string) {
  const resolved = await resolveReportForUser(userId, reportId);
  if (!resolved) return null;

  const report = await prisma.report.findUnique({
    where: { id: resolved.report.id },
  });
  if (!report) return null;

  const [manualValues, risks, document, reportContext] = await Promise.all([
    prisma.manualLabValue.findMany({
      where: { reportId: report.id, userId },
      take: 30,
      select: {
        testName: true,
        markerKey: true,
        value: true,
        valueText: true,
        unit: true,
        status: true,
      },
    }),
    prisma.healthRisk
      .findMany({
        where: { reportId: report.id, userId },
        take: 15,
        select: { title: true, level: true, message: true },
      })
      .catch(() => []),
    prisma.document.findUnique({
      where: { id: report.documentId },
      select: {
        originalFilename: true,
        familyMemberId: true,
        extractedText: true,
        familyMember: {
          select: {
            fullName: true,
            relation: true,
            gender: true,
            dateOfBirth: true,
            bloodGroup: true,
          },
        },
      },
    }),
    prisma.reportContext.findUnique({
      where: { documentId: report.documentId },
    }),
  ]);

  const accountUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      gender: true,
      dateOfBirth: true,
      bloodGroup: true,
      allergiesSummary: true,
      knownConditionsSummary: true,
    },
  });

  return {
    reportId: report.id,
    filename: document?.originalFilename,
    createdAt: report.createdAt.toISOString(),
    healthScore: report.healthScore,
    summary: report.summary?.slice(0, 3000),
    keyFindings: report.keyFindings,
    abnormalValues: report.abnormalValues,
    riskFlags: report.riskFlags,
    chartData: report.chartData,
    manualLabValues: manualValues,
    healthRisks: risks,
    questionnaire: reportContext
      ? {
          smokingStatus: reportContext.smokingStatus,
          alcoholUse: reportContext.alcoholUse,
          physicalActivity: reportContext.physicalActivity,
          knownConditions: reportContext.knownConditions,
          allergies: reportContext.allergies,
          currentMedicines: reportContext.currentMedicines,
          symptoms: reportContext.symptoms,
          notes: reportContext.notes?.slice(0, 500),
        }
      : null,
    familyMember: document?.familyMember ?? null,
    accountHolder: accountUser
      ? {
          name: accountUser.name,
          gender: accountUser.gender,
          age: computeAge(accountUser.dateOfBirth),
          bloodGroup: accountUser.bloodGroup,
          allergiesSummary: accountUser.allergiesSummary,
          conditionsSummary: accountUser.knownConditionsSummary,
        }
      : null,
    extractedPreview: document?.extractedText?.slice(0, 2000) ?? null,
  };
}

export async function buildFamilyChatContext(userId: string) {
  const [members, reports, reminders, risks, trends, appointments, medications, allergies, conditions] =
    await Promise.all([
      prisma.familyMember.findMany({
        where: { userId },
        select: {
          id: true,
          fullName: true,
          relation: true,
          gender: true,
          bloodGroup: true,
          lastReportAt: true,
          lastRiskLevel: true,
        },
      }),
      prisma.report.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          summary: true,
          healthScore: true,
          createdAt: true,
          document: {
            select: { familyMemberId: true, originalFilename: true },
          },
        },
      }),
      prisma.reminder.findMany({
        where: { userId, status: "pending" },
        take: 20,
        select: {
          title: true,
          scheduledAt: true,
          familyMemberId: true,
          status: true,
        },
      }),
      prisma.healthRisk
        .findMany({
          where: { userId, status: "active" },
          take: 20,
          select: { title: true, level: true, message: true, familyMemberId: true },
        })
        .catch(() => []),
      prisma.labTrendRecord
        .findMany({
          where: { userId },
          orderBy: { measuredAt: "desc" },
          take: 50,
          select: {
            markerKey: true,
            testName: true,
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
          where: { userId },
          orderBy: { appointmentAt: "desc" },
          take: 15,
          select: {
            title: true,
            appointmentAt: true,
            familyMemberId: true,
            status: true,
          },
        })
        .catch(() => []),
      prisma.medication.findMany({
        where: { userId, status: "active" },
        take: 30,
        select: {
          name: true,
          dosage: true,
          familyMemberId: true,
        },
      }),
      prisma.allergy.findMany({
        where: { userId },
        take: 30,
        select: { name: true, severity: true, familyMemberId: true },
      }),
      prisma.healthCondition.findMany({
        where: { userId, status: "active" },
        take: 30,
        select: { name: true, familyMemberId: true, status: true },
      }),
    ]);

  return {
    familyMembers: members,
    recentReports: reports.map((r) => ({
      id: r.id,
      summary: r.summary?.slice(0, 400),
      healthScore: r.healthScore,
      date: r.createdAt.toISOString(),
      memberId: r.document.familyMemberId,
      file: r.document.originalFilename,
    })),
    pendingReminders: reminders,
    activeHealthRisks: risks,
    labTrends: trends,
    appointments,
    activeMedications: medications,
    allergies,
    conditions,
  };
}

export function buildSupportChatContext() {
  return {
    product: "Vaidya GPT",
    operator: "UrbanMove Services Private Limited",
    topics: [
      "Upload a report: go to Upload, choose image/PDF, wait for OCR, then generate AI summary.",
      "Multi-image upload: select up to plan limit pages per report on upload screen.",
      "Billing: Plans & Billing page, Razorpay checkout for Pro/Family after billing profile (name, email, phone).",
      "Password reset: Forgot password on login, email link to reset.",
      "Profile: Settings → Profile & Patient Details for name, phone, medical info.",
      "Family member: Family → Add member, link reports to members.",
      "Language: Settings or translation banner to change UI/report language.",
      "Support tickets: Help → Tickets to contact support.",
      "Report chat: open a report → Ask Vaidya GPT for that report only.",
      "Family health chat: Health Chat from dashboard/More for saved family data.",
    ],
    routes: {
      upload: "/upload",
      billing: "/billing",
      profile: "/settings/profile",
      family: "/family",
      help: "/help",
      tickets: "/help/tickets",
      reportChat: "/reports/[id]/chat",
      healthChat: "/health-chat",
    },
  };
}
