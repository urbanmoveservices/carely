import prisma from "@/lib/prisma";
import { resolveReportForUser } from "@/lib/report-resolve";
import { accountHolderPatientContext } from "@/lib/profile";

export async function buildDoctorPack(userId: string, reportId: string) {
  const resolved = await resolveReportForUser(userId, reportId);
  if (!resolved) throw new Error("Report not found");

  const report = await prisma.report.findUnique({
    where: { id: resolved.report.id },
    include: {
      document: {
        include: {
          familyMember: {
            include: {
              medications: { where: { status: "active" }, take: 20 },
              allergies: { take: 20 },
              conditions: { take: 20 },
            },
          },
        },
      },
    },
  });

  if (!report) throw new Error("Report not found");

  const accountUser = await prisma.user.findUnique({ where: { id: userId } });
  const member = report.document.familyMember;
  const risks = await prisma.healthRisk
    .findMany({ where: { reportId: report.id, userId }, take: 15 })
    .catch(() => []);
  const trends = await prisma.labTrendRecord
    .findMany({
      where: { reportId: report.id, userId },
      orderBy: { measuredAt: "desc" },
      take: 20,
    })
    .catch(() => []);
  const symptoms = member
    ? await prisma.symptomJournalEntry.findMany({
        where: { familyMemberId: member.id, userId },
        orderBy: { occurredAt: "desc" },
        take: 10,
      })
    : [];

  const questions = [
    "What is most important in these results?",
    "Which values need follow-up testing?",
    "Are my current medicines still appropriate?",
    "What lifestyle changes should I prioritize?",
  ];

  const patient = member
    ? {
        name: member.fullName,
        relation: member.relation,
        dateOfBirth: member.dateOfBirth,
        bloodGroup: member.bloodGroup,
        gender: member.gender,
        allergies: member.allergies?.map((a) => a.name).join(", ") || null,
        conditions: member.conditions?.map((c) => c.name).join(", ") || null,
      }
    : accountUser
      ? accountHolderPatientContext(accountUser)
      : null;

  return {
    generatedAt: new Date().toISOString(),
    patient,
    accountHolder: accountUser ? accountHolderPatientContext(accountUser) : null,
    report: {
      id: report.id,
      filename: report.document.originalFilename,
      date: report.createdAt,
      summary: report.summary,
      keyFindings: report.keyFindings,
      abnormalValues: report.abnormalValues,
      riskFlags: report.riskFlags,
      healthScore: report.healthScore,
    },
    healthRisks: risks,
    labTrends: trends,
    medications: member?.medications ?? [],
    allergies: member?.allergies ?? [],
    conditions: member?.conditions ?? [],
    recentSymptoms: symptoms,
    questionsForDoctor: questions,
    disclaimer:
      "This pack is based on your saved report data. Not a final diagnosis—for discussion with your doctor.",
  };
}
