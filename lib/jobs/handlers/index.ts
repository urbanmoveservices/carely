import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { JOB_TYPES } from "../queue";
import { buildUserDataExport } from "@/lib/data-export";
import { sendEmail } from "@/lib/email/send-email";

export async function runJobHandler(
  type: string,
  payload: Prisma.JsonValue | null,
  userId: string | null
): Promise<Record<string, unknown>> {
  const data = (payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload
    : {}) as Record<string, unknown>;

  switch (type) {
    case JOB_TYPES.DATA_EXPORT: {
      const exportId = String(data.exportId || "");
      const uid = userId || String(data.userId || "");
      const result = await buildUserDataExport(uid, exportId);
      return result;
    }
    case JOB_TYPES.EMAIL_SEND: {
      await sendEmail({
        to: String(data.to || ""),
        type: data.templateType as "email_verification",
        data: (data.templateData as Record<string, string>) || {},
        userId,
      });
      return { sent: true };
    }
    case JOB_TYPES.DOCUMENT_EXTRACTION: {
      const documentId = String(data.documentId || "");
      const { extractTextFromDocument } = await import("@/lib/document-extraction");
      const { readStoredFile } = await import("@/lib/storage");
      const doc = await prisma.document.findUnique({ where: { id: documentId } });
      if (!doc?.storagePath) throw new Error("Document not found");
      const fileBuffer = await readStoredFile(doc.storagePath, {
        isEncrypted: doc.isEncrypted,
        encryptionIv: doc.encryptionIv,
        encryptionTag: doc.encryptionTag,
      });
      const result = await extractTextFromDocument({
        filePath: doc.storagePath,
        mimeType: doc.fileType,
        originalFilename: doc.originalFilename,
        fileBuffer,
      });
      await prisma.document.update({
        where: { id: documentId },
        data: {
          extractedText: result.text,
          uploadStatus: "text_extracted",
          errorMessage: result.warning || null,
        },
      });
      return { documentId };
    }
    case JOB_TYPES.AI_SUMMARY_GENERATION: {
      const documentId = String(data.documentId || "");
      const doc = await prisma.document.findUnique({ where: { id: documentId } });
      if (!doc?.extractedText) throw new Error("Document text not ready");
      const {
        buildAiHealthContextBundle,
        getFamilySuggestedDefaults,
        serializeReportContext,
        inputFromReportContext,
      } = await import("@/lib/report-context-service");
      const { generateAndPersistReport } = await import(
        "@/lib/report-summary-service"
      );
      const ctxRow = await prisma.reportContext.findUnique({
        where: { documentId },
      });
      if (!ctxRow) throw new Error("Report context required before AI summary job");
      const ctx = serializeReportContext(ctxRow);
      const contextInput = inputFromReportContext(ctx);
      const skipContext = ctx.notes?.includes("skipped") ?? false;
      const familyDefaults = await getFamilySuggestedDefaults(doc.familyMemberId);
      const healthContext = buildAiHealthContextBundle(
        contextInput,
        familyDefaults,
        skipContext
      );
      await generateAndPersistReport({
        userId: userId!,
        documentId,
        extractedText: doc.extractedText,
        originalFilename: doc.originalFilename,
        uploadMode: doc.uploadMode,
        pageCount: doc.pageCount,
        language: (data.language as string) || "en",
        healthContext,
        replaceExisting: Boolean(data.replaceExisting),
      });
      return { documentId };
    }
    case JOB_TYPES.REPORT_POST_PROCESSING: {
      const reportId = String(data.reportId || "");
      const report = await prisma.report.findUnique({
        where: { id: reportId },
        include: { document: true },
      });
      if (!report) throw new Error("Report not found");
      const { runReportPostProcessing } = await import("@/lib/report-post-processing");
      const doc = report.document;
      await runReportPostProcessing({
        userId: report.userId,
        documentId: report.documentId,
        reportId: report.id,
        familyMemberId: doc.familyMemberId,
        report: {
          id: report.id,
          summary: report.summary,
          keyFindings: report.keyFindings,
          abnormalValues: report.abnormalValues,
          riskFlags: report.riskFlags,
          chartData: report.chartData,
          contextualInsights: report.contextualInsights,
          healthScore: report.healthScore,
          createdAt: report.createdAt,
        },
        document: {
          id: doc.id,
          originalFilename: doc.originalFilename,
          createdAt: doc.createdAt,
        },
      });
      return { reportId };
    }
    case JOB_TYPES.REPORT_TRANSLATION: {
      const reportId = String(data.reportId || "");
      const language = String(data.language || "hi");
      const report = await prisma.report.findUnique({ where: { id: reportId } });
      if (!report) throw new Error("Report not found");
      const { translateReportContent } = await import("@/lib/report-translation");
      await translateReportContent({
        report,
        language,
        allowCloud: true,
      });
      return { reportId, language };
    }
    case JOB_TYPES.HEALTH_RISK_BACKFILL: {
      const { rerunPostProcessingForReport } = await import(
        "@/lib/rerun-report-post-processing"
      );
      const reportId = String(data.reportId || "");
      const uid = userId || String(data.userId || "");
      if (!uid) throw new Error("userId required for health risk backfill");
      await rerunPostProcessingForReport(uid, reportId);
      return { reportId };
    }
    case JOB_TYPES.PUSH_SEND: {
      const { sendPushToUser } = await import("@/lib/push/send-push");
      await sendPushToUser(userId!, {
        title: String(data.title || "Vaidya GPT"),
        body: String(data.body || ""),
      });
      return { pushed: true };
    }
    default:
      throw new Error(`Unknown job type: ${type}`);
  }
}
