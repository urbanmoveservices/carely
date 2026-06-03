import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { ok, unauthorized, notFound, fail, rateLimited } from "@/lib/api-response";
import { canGenerateAiSummary, incrementAiSummaryUsage } from "@/lib/plans";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";
import { generateAndPersistReport } from "@/lib/report-summary-service";
import { assertOpenAiConfigured } from "@/lib/summary-error-messages";
import { toSummaryApiResponse } from "@/lib/summary-api-errors";
import {
  buildAiHealthContextBundle,
  countContextFields,
  getFamilySuggestedDefaults,
  inputFromReportContext,
  serializeReportContext,
  upsertReportContext,
} from "@/lib/report-context-service";
import {
  generateSummaryWithContextSchema,
  reportContextInputSchema,
} from "@/lib/report-context-schema";

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

    const rl = checkRateLimit(
      "regenerate-summary",
      payload.userId,
      RATE_LIMITS.GENERATE_SUMMARY
    );
    if (!rl.allowed) return rateLimited();

    const { id: documentId } = await params;

    const document = await prisma.document.findFirst({
      where: { id: documentId, userId: payload.userId },
      include: {
        report: { select: { id: true } },
        reportContext: true,
        familyMember: {
          select: { id: true, fullName: true, relation: true },
        },
      },
    });

    if (!document) return notFound("Document not found");

    if (!document.extractedText?.trim() || document.extractedText.trim().length < 100) {
      return fail(
        "Text extraction is not completed or readable enough.",
        400,
        "TEXT_NOT_READY"
      );
    }

    if (!document.report) {
      return fail("No existing report to regenerate. Generate a summary first.", 400);
    }

    const body = await req.json().catch(() => ({}));
    const parsed = generateSummaryWithContextSchema.safeParse(body);

    let contextInput;
    let skipContext = false;

    if (parsed.success && parsed.data.context) {
      contextInput = reportContextInputSchema.parse(parsed.data.context);
      skipContext = false;
      await upsertReportContext(
        payload.userId,
        document.id,
        document.familyMemberId,
        contextInput
      );
    } else if (document.reportContext) {
      const ctx = serializeReportContext(document.reportContext);
      contextInput = inputFromReportContext(ctx);
      skipContext = ctx.notes?.includes("skipped") ?? false;
    } else {
      return fail(
        "Health context is required. Complete the questionnaire first.",
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

    const previousReportId = document.report.id;
    const familyDefaults = await getFamilySuggestedDefaults(document.familyMemberId);
    const healthContext = buildAiHealthContextBundle(
      contextInput,
      familyDefaults,
      skipContext
    );

    await auditUserAction(
      req,
      payload.userId,
      payload.email,
      AUDIT_ACTIONS.AI_SUMMARY_REGENERATED,
      {
        entityType: "document",
        entityId: document.id,
        metadata: { previousReportId, hasContext: true },
      }
    );

    const pref = await prisma.userPreference.findUnique({
      where: { userId: payload.userId },
      select: { language: true },
    });

    await prisma.document.update({
      where: { id: document.id },
      data: { uploadStatus: "generating_summary", errorMessage: null },
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
        replaceExisting: true,
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
            regenerated: true,
            hasContext: true,
            contextFieldsCount: countContextFields(contextInput),
          },
        }
      );

      await auditUserAction(
        req,
        payload.userId,
        payload.email,
        AUDIT_ACTIONS.REPORT_POST_PROCESSING_COMPLETED,
        {
          entityType: "report",
          entityId: report.id,
          metadata: { ...postProcessing, regenerated: true },
        }
      );

      return ok({
        report_id: report.id,
        document_id: document.id,
        upload_status: "ai_completed",
        summary: report.summary,
        created_at: report.createdAt.toISOString(),
        regenerated: true,
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
          errorMessage: "AI summary could not be regenerated. You can try again.",
        },
      });
      await auditUserAction(req, payload.userId, payload.email, AUDIT_ACTIONS.AI_SUMMARY_FAILED, {
        entityType: "document",
        entityId: document.id,
        metadata: { errorCode: code, regenerated: true },
      });
      throw aiErr;
    }
  } catch (err: unknown) {
    console.error("Regenerate summary error:", err);
    return toSummaryApiResponse(err);
  }
}
