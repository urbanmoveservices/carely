import { mkdir, writeFile } from "fs/promises";
import path from "path";
import prisma from "./prisma";

function exportDir(): string {
  return path.join(process.cwd(), "storage", "exports");
}

export async function buildUserDataExport(
  userId: string,
  exportId: string
): Promise<Record<string, unknown>> {
  const [
    user,
    familyMembers,
    documents,
    reports,
    reminders,
    healthRisks,
    accessLogs,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        currentPlan: true,
        createdAt: true,
        emailVerified: true,
      },
    }),
    prisma.familyMember.findMany({ where: { userId } }),
    prisma.document.findMany({
      where: { userId },
      select: {
        id: true,
        originalFilename: true,
        fileType: true,
        fileSize: true,
        uploadStatus: true,
        familyMemberId: true,
        createdAt: true,
      },
    }),
    prisma.report.findMany({
      where: { userId },
      select: {
        id: true,
        documentId: true,
        summary: true,
        keyFindings: true,
        abnormalValues: true,
        foodRecommendations: true,
        exerciseRecommendations: true,
        lifestyleAdvice: true,
        riskFlags: true,
        chartData: true,
        healthScore: true,
        createdAt: true,
      },
    }),
    prisma.reminder.findMany({ where: { userId } }),
    prisma.healthRisk.findMany({ where: { userId } }).catch(() => []),
    prisma.accessLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  const bundle = {
    exportedAt: new Date().toISOString(),
    user,
    familyMembers,
    documents,
    reports,
    reminders,
    healthRisks,
    accessLogs,
  };

  const dir = exportDir();
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${exportId}.json`);
  await writeFile(filePath, JSON.stringify(bundle, null, 2), "utf8");

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.dataExportRequest.update({
    where: { id: exportId },
    data: {
      status: "completed",
      filePath: exportId,
      completedAt: new Date(),
      expiresAt,
    },
  });

  return { exportId, format: "json", expiresAt: expiresAt.toISOString() };
}

export function resolveExportFile(exportId: string): string {
  return path.join(exportDir(), `${exportId}.json`);
}
