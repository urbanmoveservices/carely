import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export async function updateFamilyMemberAfterReport(params: {
  familyMemberId?: string | null;
  healthScore?: number | null;
  reportCreatedAt: Date;
  highestRiskLevel: "critical" | "warning" | "info" | null;
}) {
  if (!params.familyMemberId) return;

  const data: Prisma.FamilyMemberUpdateInput = {
    lastReportAt: params.reportCreatedAt,
    lastAiSummaryAt: new Date(),
  };
  if (typeof params.healthScore === "number") {
    data.healthScoreLatest = params.healthScore;
  }
  if (params.highestRiskLevel) {
    data.lastRiskLevel = params.highestRiskLevel;
  }

  try {
    await prisma.familyMember.update({
      where: { id: params.familyMemberId },
      data,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("Unknown argument") ||
      msg.includes("lastReportAt") ||
      msg.includes("healthScoreLatest")
    ) {
      console.warn(
        "[post-processing] FamilyMember profile fields not available. Run npx prisma migrate dev and npx prisma generate, then restart dev server."
      );
      return;
    }
    throw err;
  }
}

export function highestRiskLevel(
  levels: string[]
): "critical" | "warning" | "info" | null {
  if (levels.includes("critical")) return "critical";
  if (levels.includes("warning")) return "warning";
  if (levels.includes("info")) return "info";
  return null;
}
