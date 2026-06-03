import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";

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

    const doc = await prisma.document.findFirst({
      where: { id, userId: payload.userId },
      include: {
        report: true,
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (!doc.report) {
      return NextResponse.json(
        { error: "No report exists for this document" },
        { status: 404 }
      );
    }

    const r = doc.report;
    return NextResponse.json({
      id: r.id,
      documentId: r.documentId,
      summary: r.summary,
      keyFindings: r.keyFindings,
      abnormalValues: r.abnormalValues,
      foodRecommendations: r.foodRecommendations,
      exerciseRecommendations: r.exerciseRecommendations,
      lifestyleAdvice: r.lifestyleAdvice,
      riskFlags: r.riskFlags,
      chartData: r.chartData,
      healthScore: r.healthScore,
      aiModelUsed: r.aiModelUsed,
      processingTimeMs: r.processingTimeMs,
      createdAt: r.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("Document report error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
