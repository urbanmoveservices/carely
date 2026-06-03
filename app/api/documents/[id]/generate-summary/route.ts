import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { ok, unauthorized, notFound, fail, rateLimited, validationError } from "@/lib/api-response";
import { canGenerateAiSummary, incrementAiSummaryUsage } from "@/lib/plans";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";
import { generateAndPersistReport } from "@/lib/report-summary-service";
import { assertOpenAiConfigured } from "@/lib/summary-error-messages";
import { toSummaryApiResponse } from "@/lib/summary-api-errors";
import {
  generateSummaryWithContextSchema,
  reportContextInputSchema,
} from "@/lib/report-context-schema";
import {
  buildAiHealthContextBundle,
  countContextFields,
  getFamilySuggestedDefaults,
  inputFromReportContext,
  minimalSkippedContext,
  serializeReportContext,
  upsertReportContext,
} from "@/lib/report-context-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();

    const payload = verifyToken(token);
    if (!payload) return unauthorized("Invalid token");

    assertOpenAiConfigured();

    const rl = checkRateLimit("generate-summary", payload.userId, RATE_LIMITS.GENERATE_SUMMARY);
    if (!rl.allowed) return rateLimited();

    const { id: documentId } = await params;

    const document = await prisma.document.findFirst({
      where: { id: documentId, userId: payload.userId },
      include: {
        report: { select: { id: true, createdAt: true } },
        reportContext: true,
        familyMember: {
          select: { id: true, fullName: true, relation: true },
        },
      },
    });

    if (!document) return notFound("Document not found");

    if (document.report) {
      return ok({
        report_id: document.report.id,
        document_id: document.id,
        upload_status: document.uploadStatus,
        summary: "Report already exists",
        created_at: document.report.createdAt.toISOString(),
      });
    }

    if (document.uploadStatus === "uploaded" || document.uploadStatus === "processing") {
      return fail("Text extraction is not completed yet.", 400, "TEXT_NOT_READY");
    }

    if (document.uploadStatus === "failed") {
      return fail("This document failed processing and cannot be summarized.", 400);
    }

    if (!document.extractedText?.trim() || document.extractedText.trim().length < 100) {
      return fail(
        "Text extraction is not completed or readable enough.",
        400,
        "TEXT_NOT_READY"
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = generateSummaryWithContextSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(
        parsed.error.issues.map((i) => i.message).join("; ") || "Invalid request"
      );
    }

    const skipContext = parsed.data.skipContext === true;
    const consent = parsed.data.consentAcknowledged === true;

    if (!skipContext && !consent) {
      return fail(
        "Please confirm you understand this AI report may include diagnoses and medication suggestions.",
        400,
        "CONSENT_REQUIRED"
      );
    }

    let contextInput: ReturnType<typeof reportContextInputSchema.parse>;
    if (skipContext) {
      contextInput = minimalSkippedContext();
    } else if (parsed.data.context) {
      contextInput = reportContextInputSchema.parse(parsed.data.context);
    } else if (document.reportContext) {
      contextInput = reportContextInputSchema.parse(
        inputFromReportContext(serializeReportContext(document.reportContext))
      );
    } else {
      return fail(
        "Health context is required before generating AI summary.",
        400,
        "REPORT_CONTEXT_REQUIRED"
      );
    }

    const aiCheck = await canGenerateAiSummary(payload.userId);
    if (!aiCheck.allowed) {
      return fail(
        "Monthly AI summary limit reached. Upgrade your plan to generate more summaries.",
        403,
        "AI_LIMIT_REACHED"
      );
    }

    await upsertReportContext(
      payload.userId,
      document.id,
      document.familyMemberId,
      contextInput
    );

    const familyDefaults = await getFamilySuggestedDefaults(document.familyMemberId);
    const healthContext = buildAiHealthContextBundle(
      contextInput,
      familyDefaults,
      skipContext
    );

    await prisma.document.update({
      where: { id: document.id },
      data: { uploadStatus: "generating_summary", errorMessage: null },
    });

    await auditUserAction(req, payload.userId, payload.email, AUDIT_ACTIONS.AI_SUMMARY_STARTED, {
      entityType: "document",
      entityId: document.id,
    });

    if (skipContext) {
      await auditUserAction(req, payload.userId, payload.email, AUDIT_ACTIONS.REPORT_CONTEXT_SKIPPED, {
        entityType: "document",
        entityId: document.id,
        metadata: { documentId: document.id },
      });
    } else {
      await auditUserAction(req, payload.userId, payload.email, AUDIT_ACTIONS.REPORT_CONTEXT_SAVED, {
        entityType: "document",
        entityId: document.id,
        metadata: {
          documentId: document.id,
          familyMemberId: document.familyMemberId,
          hasContext: true,
          contextFieldsCount: countContextFields(contextInput),
        },
      });
    }

    const pref = await prisma.userPreference.findUnique({
      where: { userId: payload.userId },
      select: { language: true },
    });

    try {
      const { report, model, postProcessing } = await generateAndPersistReport({
        userId: payload.userId,
        documentId: document.id,
        extractedText: document.extractedText,
        originalFilename: document.originalFilename,
        uploadMode: document.uploadMode,
        pageCount: document.pageCount,
        language: pref?.language || "en",
        healthContext,
      });

      await incrementAiSummaryUsage(payload.userId, req, payload.email);

      await auditUserAction(
        req,
        payload.userId,
        payload.email,
        AUDIT_ACTIONS.AI_SUMMARY_GENERATED_WITH_CONTEXT,
        {
          entityType: "report",
          entityId: report.id,
          metadata: {
            documentId: document.id,
            model,
            hasContext: !skipContext,
            contextFieldsCount: skipContext ? 0 : countContextFields(contextInput),
          },
        }
      );

      await auditUserAction(req, payload.userId, payload.email, AUDIT_ACTIONS.AI_SUMMARY_COMPLETED, {
        entityType: "report",
        entityId: report.id,
        metadata: { documentId: document.id, model },
      });

      await auditUserAction(
        req,
        payload.userId,
        payload.email,
        AUDIT_ACTIONS.REPORT_POST_PROCESSING_COMPLETED,
        {
          entityType: "report",
          entityId: report.id,
          metadata: postProcessing,
        }
      );

      return ok({
        report_id: report.id,
        document_id: document.id,
        upload_status: "ai_completed",
        summary: report.summary,
        created_at: report.createdAt.toISOString(),
        postProcessing,
      });
    } catch (aiErr: unknown) {
      const code =
        aiErr instanceof Error && "code" in aiErr
          ? String((aiErr as { code?: string }).code)
          : "AI_GENERATION_FAILED";
      await prisma.document.update({
        where: { id: document.id },
        data: {
          uploadStatus: "summary_failed",
          errorMessage: "AI summary could not be generated. You can try again.",
        },
      });
      await auditUserAction(req, payload.userId, payload.email, AUDIT_ACTIONS.AI_SUMMARY_FAILED, {
        entityType: "document",
        entityId: document.id,
        metadata: { errorCode: code },
      });
      throw aiErr;
    }
  } catch (err: unknown) {
    console.error("Generate summary error:", err);
    return toSummaryApiResponse(err);
  }
}
