import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { deleteStoredFile } from "@/lib/storage";
import { ok, unauthorized, forbidden, notFound, serverError, rateLimited } from "@/lib/api-response";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { auditAdminAction, AUDIT_ACTIONS } from "@/lib/audit-log";

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

    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        report: { select: { id: true } },
        pages: { orderBy: { pageNumber: "asc" } },
      },
    });

    if (!doc) return notFound("Document not found");

    return ok({
      id: doc.id,
      originalFilename: doc.originalFilename,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      uploadMode: doc.uploadMode ?? "single",
      pageCount: doc.pageCount ?? 1,
      pages: doc.pages.map((p) => ({
        id: p.id,
        pageNumber: p.pageNumber,
        originalFilename: p.originalFilename,
        mimeType: p.mimeType,
        fileSize: p.fileSize,
        ocrStatus: p.ocrStatus,
        errorMessage: p.errorMessage,
        extractedTextLength: p.extractedText?.length ?? 0,
      })),
      uploadStatus: doc.uploadStatus,
      errorMessage: doc.errorMessage,
      extractedTextPreview: doc.extractedText
        ? doc.extractedText.slice(0, 500)
        : null,
      extractedTextLength: doc.extractedText
        ? doc.extractedText.length
        : 0,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      user: doc.user,
      reportId: doc.report?.id || null,
    });
  } catch (err) {
    console.error("Admin document detail error:", err);
    return serverError();
  }
}

export async function DELETE(
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

    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return notFound("Document not found");

    if (doc.storagePath) {
      await deleteStoredFile(doc.storagePath);
    }

    await prisma.document.delete({ where: { id } });

    await auditAdminAction(req, payload.userId, payload.email, AUDIT_ACTIONS.ADMIN_DELETED_DOCUMENT, {
      entityType: "document",
      entityId: id,
      metadata: { filename: doc.originalFilename, userId: doc.userId },
    });

    return ok({ message: "Document deleted successfully" });
  } catch (err) {
    console.error("Admin delete document error:", err);
    return serverError();
  }
}
