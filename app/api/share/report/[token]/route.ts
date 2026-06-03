import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notFound, serverError } from "@/lib/api-response";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit-log";
import { MEDICAL_DISCLAIMER } from "@/lib/brand";

const DISCLAIMER = `${MEDICAL_DISCLAIMER} Shared view only—confirm care decisions with a qualified clinician.`;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const link = await prisma.doctorShareLink.findUnique({
      where: { token },
      include: {
        report: {
          include: {
            document: {
              select: {
                originalFilename: true,
                createdAt: true,
                familyMember: {
                  select: { fullName: true, relation: true },
                },
              },
            },
          },
        },
      },
    });

    if (!link) return notFound("Share link not found");
    if (link.revokedAt) return notFound("This share link has been revoked");
    if (link.expiresAt < new Date()) return notFound("This share link has expired");

    await prisma.doctorShareLink.update({
      where: { id: link.id },
      data: {
        accessCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    });

    await createAuditLog({
      action: AUDIT_ACTIONS.DOCTOR_SHARE_LINK_ACCESSED,
      entityType: "doctor_share_link",
      entityId: link.id,
      metadata: { accessCount: link.accessCount + 1 },
    });

    const r = link.report;
    const doc = r.document;

    return NextResponse.json({
      recipientName: link.recipientName,
      recipientEmail: link.recipientEmail,
      note: link.note,
      expiresAt: link.expiresAt.toISOString(),
      report: {
        id: r.id,
        summary: r.summary,
        keyFindings: r.keyFindings,
        abnormalValues: r.abnormalValues,
        foodRecommendations: r.foodRecommendations,
        exerciseRecommendations: r.exerciseRecommendations,
        lifestyleAdvice: r.lifestyleAdvice,
        riskFlags: r.riskFlags,
        chartData: r.chartData,
        contextualInsights: r.contextualInsights ?? [],
        healthScore: r.healthScore,
        createdAt: r.createdAt.toISOString(),
        document: {
          originalFilename: doc.originalFilename,
          createdAt: doc.createdAt.toISOString(),
        },
        familyMember: doc.familyMember
          ? { fullName: doc.familyMember.fullName, relation: doc.familyMember.relation }
          : null,
      },
      disclaimer: DISCLAIMER,
    });
  } catch (err) {
    console.error("Public share report error:", err);
    return serverError();
  }
}
