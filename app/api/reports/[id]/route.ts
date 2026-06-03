import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { resolveReportForUser } from "@/lib/report-resolve";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { id } = await params;

    const resolved = await resolveReportForUser(payload.userId, id);
    if (!resolved) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const report = await prisma.report.findFirst({
      where: { id: resolved.report.id, userId: payload.userId },
      include: {
        document: {
          select: {
            id: true,
            originalFilename: true,
            fileType: true,
            fileSize: true,
            uploadStatus: true,
            createdAt: true,
            familyMember: {
              select: { id: true, fullName: true, relation: true },
            },
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: report.id,
      documentId: report.documentId,
      summary: report.summary,
      keyFindings: report.keyFindings,
      abnormalValues: report.abnormalValues,
      foodRecommendations: report.foodRecommendations,
      exerciseRecommendations: report.exerciseRecommendations,
      lifestyleAdvice: report.lifestyleAdvice,
      riskFlags: report.riskFlags,
      chartData: report.chartData,
      contextualInsights: report.contextualInsights ?? [],
      healthScore: report.healthScore,
      aiModelUsed: report.aiModelUsed,
      processingTimeMs: report.processingTimeMs,
      createdAt: report.createdAt.toISOString(),
      document: {
        id: report.document.id,
        originalFilename: report.document.originalFilename,
        fileType: report.document.fileType,
        fileSize: report.document.fileSize,
        uploadStatus: report.document.uploadStatus,
        createdAt: report.document.createdAt.toISOString(),
      },
      family_member: report.document.familyMember
        ? {
            id: report.document.familyMember.id,
            fullName: report.document.familyMember.fullName,
            relation: report.document.familyMember.relation,
          }
        : null,
    });
  } catch (err) {
    console.error("Report detail error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
