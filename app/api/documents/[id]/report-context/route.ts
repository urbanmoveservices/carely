import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import {
  ok,
  unauthorized,
  notFound,
  fail,
  validationError,
} from "@/lib/api-response";
import { reportContextInputSchema } from "@/lib/report-context-schema";
import {
  getFamilySuggestedDefaults,
  serializeReportContext,
  upsertReportContext,
  countContextFields,
} from "@/lib/report-context-service";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

async function loadDocument(documentId: string, userId: string) {
  return prisma.document.findFirst({
    where: { id: documentId, userId },
    include: {
      familyMember: {
        select: { id: true, fullName: true, relation: true },
      },
      reportContext: true,
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();

    const payload = verifyToken(token);
    if (!payload) return unauthorized("Invalid token");

    const { id: documentId } = await params;
    const document = await loadDocument(documentId, payload.userId);
    if (!document) return notFound("Document not found");

    const suggested_defaults = await getFamilySuggestedDefaults(
      document.familyMemberId
    );

    return ok({
      context: document.reportContext
        ? serializeReportContext(document.reportContext)
        : null,
      suggested_defaults,
      document: {
        id: document.id,
        original_filename: document.originalFilename,
        upload_status: document.uploadStatus,
        family_member: document.familyMember
          ? {
              id: document.familyMember.id,
              fullName: document.familyMember.fullName,
              relation: document.familyMember.relation,
            }
          : null,
      },
    });
  } catch (err) {
    console.error("Get report context error:", err);
    return fail("Could not load health context.", 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();

    const payload = verifyToken(token);
    if (!payload) return unauthorized("Invalid token");

    const { id: documentId } = await params;
    const document = await loadDocument(documentId, payload.userId);
    if (!document) return notFound("Document not found");

    const body = await req.json().catch(() => ({}));
    const parsed = reportContextInputSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(
        parsed.error.issues.map((i) => i.message).join("; ") || "Invalid context"
      );
    }

    const context = await upsertReportContext(
      payload.userId,
      document.id,
      document.familyMemberId,
      parsed.data
    );

    await auditUserAction(req, payload.userId, payload.email, AUDIT_ACTIONS.REPORT_CONTEXT_SAVED, {
      entityType: "document",
      entityId: document.id,
      metadata: {
        documentId: document.id,
        familyMemberId: document.familyMemberId,
        hasContext: true,
        contextFieldsCount: countContextFields(parsed.data),
      },
    });

    return ok({ context });
  } catch (err) {
    console.error("Save report context error:", err);
    return fail("Could not save health context.", 500);
  }
}
