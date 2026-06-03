import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { ok, unauthorized, forbidden, notFound, serverError, rateLimited } from "@/lib/api-response";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { auditAdminAction, AUDIT_ACTIONS } from "@/lib/audit-log";
import { computeAge, evaluateProfileCompletion } from "@/lib/profile";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") return forbidden("Admin access required");

    const rl = checkRateLimit("admin-api", payload.userId, RATE_LIMITS.ADMIN_API);
    if (!rl.allowed) return rateLimited();

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        documents: {
          orderBy: { createdAt: "desc" },
          include: {
            report: { select: { id: true } },
            familyMember: { select: { id: true, fullName: true, relation: true } },
          },
        },
        reports: {
          orderBy: { createdAt: "desc" },
          select: { id: true, summary: true, createdAt: true, documentId: true },
        },
        familyMembers: {
          orderBy: { createdAt: "desc" },
          include: {
            _count: {
              select: {
                documents: true,
                conditions: true,
                medications: true,
                appointments: true,
              },
            },
          },
        },
        preference: { select: { language: true } },
      },
    });

    if (!user) return notFound("User not found");

    await auditAdminAction(req, payload.userId, payload.email, AUDIT_ACTIONS.ADMIN_VIEWED_USER, {
      entityType: "user",
      entityId: id,
    });

    const profileFlags = evaluateProfileCompletion(user);

    return ok({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      language: user.preference?.language ?? user.preferredLanguage ?? "en",
      phoneNumber: user.phoneNumber,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth?.toISOString().slice(0, 10) ?? null,
      age: computeAge(user.dateOfBirth),
      bloodGroup: user.bloodGroup,
      currentPlan: user.currentPlan,
      billingProfileCompleted: profileFlags.billingProfileCompleted,
      medicalProfileCompleted: profileFlags.medicalProfileCompleted,
      profileCompleted: profileFlags.profileCompleted,
      documents: user.documents.map((d) => ({
        id: d.id,
        originalFilename: d.originalFilename,
        fileType: d.fileType,
        fileSize: d.fileSize,
        uploadStatus: d.uploadStatus,
        createdAt: d.createdAt.toISOString(),
        reportId: d.report?.id || null,
        familyMember: d.familyMember
          ? { id: d.familyMember.id, fullName: d.familyMember.fullName, relation: d.familyMember.relation }
          : null,
      })),
      reports: user.reports.map((r) => ({
        id: r.id,
        summary: r.summary,
        createdAt: r.createdAt.toISOString(),
        documentId: r.documentId,
      })),
      familyMembers: user.familyMembers.map((m) => ({
        id: m.id,
        fullName: m.fullName,
        relation: m.relation,
        documentCount: m._count.documents,
        conditionCount: m._count.conditions,
        medicationCount: m._count.medications,
        appointmentCount: m._count.appointments,
      })),
    });
  } catch (err) {
    console.error("Admin user detail error:", err);
    return serverError();
  }
}
