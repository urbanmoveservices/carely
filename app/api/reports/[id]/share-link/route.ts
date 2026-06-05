import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { forbidden, notFound, serverError, validationError } from "@/lib/api-response";
import { generateSecureToken } from "@/lib/secure-token";
import { absoluteUrl, getBaseUrlFromRequest } from "@/lib/app-url";
import { resolveReportForUser } from "@/lib/report-resolve";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

const bodySchema = z.object({
  recipientName: z.string().max(200).optional(),
  recipientEmail: z.string().email().optional(),
  note: z.string().max(1000).optional(),
  expiresInDays: z.union([z.literal(1), z.literal(3), z.literal(7), z.literal(14), z.literal(30)]).default(7),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id: idParam } = await params;

    const resolved = await resolveReportForUser(auth.payload.userId, idParam);
    if (!resolved) return notFound("Report not found");
    const reportId = resolved.report.id;

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error.issues[0]?.message || "Invalid input");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parsed.data.expiresInDays);
    const token = generateSecureToken();

    const link = await prisma.doctorShareLink.create({
      data: {
        userId: auth.payload.userId,
        reportId,
        token,
        recipientName: parsed.data.recipientName ?? null,
        recipientEmail: parsed.data.recipientEmail ?? null,
        note: parsed.data.note ?? null,
        expiresAt,
      },
    });

    await auditUserAction(req, auth.payload.userId, auth.payload.email, AUDIT_ACTIONS.DOCTOR_SHARE_LINK_CREATED, {
      entityType: "doctor_share_link",
      entityId: link.id,
      metadata: { reportId, expiresInDays: parsed.data.expiresInDays },
    });

    const { onDoctorShareCreated } = await import("@/lib/email/automation-triggers");
    void onDoctorShareCreated(
      auth.payload.userId,
      absoluteUrl(`/share/report/${token}`)
    );

    return NextResponse.json({
      shareUrl: `${getBaseUrlFromRequest(req)}/share/report/${token}`,
      expiresAt: link.expiresAt.toISOString(),
      id: link.id,
    });
  } catch (err) {
    console.error("Share link create error:", err);
    return serverError();
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id: idParam } = await params;

    const resolved = await resolveReportForUser(auth.payload.userId, idParam);
    if (!resolved) return notFound("Report not found");
    const reportId = resolved.report.id;

    const links = await prisma.doctorShareLink.findMany({
      where: { reportId, userId: auth.payload.userId },
      orderBy: { createdAt: "desc" },
    });

    const base = getBaseUrlFromRequest(req);
    return NextResponse.json(
      links.map((l) => ({
        id: l.id,
        shareUrl: `${base}/share/report/${l.token}`,
        recipientName: l.recipientName,
        recipientEmail: l.recipientEmail,
        note: l.note,
        expiresAt: l.expiresAt.toISOString(),
        revokedAt: l.revokedAt?.toISOString() ?? null,
        accessCount: l.accessCount,
        lastAccessedAt: l.lastAccessedAt?.toISOString() ?? null,
        createdAt: l.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    console.error("Share links list error:", err);
    return serverError();
  }
}
