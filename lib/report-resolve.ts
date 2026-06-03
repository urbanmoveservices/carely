import prisma from "@/lib/prisma";

export type ResolvedReport = {
  id: string;
  documentId: string;
  userId: string;
  summary: string;
  keyFindings: unknown;
  abnormalValues: unknown;
  riskFlags: unknown;
  document: {
    originalFilename: string;
    familyMemberId: string | null;
    familyMember?: { id: string; fullName: string; relation: string } | null;
  };
};

export type ReportLookupSource = "reportId" | "documentId" | null;

const reportInclude = {
  document: {
    select: {
      originalFilename: true,
      familyMemberId: true,
      familyMember: {
        select: { id: true, fullName: true, relation: true },
      },
    },
  },
} as const;

export async function resolveReportForUser(
  userId: string,
  idParam: string
): Promise<{ report: ResolvedReport; source: ReportLookupSource } | null> {
  let source: ReportLookupSource = null;

  let report = await prisma.report.findFirst({
    where: { id: idParam, userId },
    include: reportInclude,
  });

  if (report) {
    source = "reportId";
  } else {
    report = await prisma.report.findFirst({
      where: { documentId: idParam, userId },
      include: reportInclude,
    });
    if (report) source = "documentId";
  }

  if (!report) return null;

  return {
    report: {
      id: report.id,
      documentId: report.documentId,
      userId: report.userId,
      summary: report.summary,
      keyFindings: report.keyFindings,
      abnormalValues: report.abnormalValues,
      riskFlags: report.riskFlags,
      document: {
        originalFilename: report.document.originalFilename,
        familyMemberId: report.document.familyMemberId,
        familyMember: report.document.familyMember,
      },
    },
    source,
  };
}

export function logReportResolveDev(
  idParam: string,
  userId: string,
  source: ReportLookupSource,
  reportId: string | null
) {
  if (process.env.NODE_ENV !== "development") return;
  console.log("[doctor-questions] resolve", {
    receivedId: idParam,
    userId,
    foundBy: source,
    reportId,
  });
}
