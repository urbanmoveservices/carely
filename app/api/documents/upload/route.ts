import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { validateUploadFile, validateMultiImageBatch } from "@/lib/file-validation";
import { saveUploadedFile } from "@/lib/storage";
import { extractTextFromDocument } from "@/lib/document-extraction";
import {
  OCRProviderError,
  isOpenAiOcrConfigured,
} from "@/lib/ocr/ocr-provider";
import { isTesseractOcrEnabled } from "@/lib/ocr/tesseract-ocr";
import {
  unauthorized,
  validationError,
  serverError,
  rateLimited,
  fail,
  failWithMeta,
} from "@/lib/api-response";
import {
  canUpload,
  incrementUploadUsage,
  getImagePageLimitForUser,
  checkImagePageCount,
  normalizePlanKey,
} from "@/lib/plans";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";
import { createMultiImageDocument } from "@/lib/multi-image-document";
import { serializeDocumentResponse } from "@/lib/document-serialize";

function collectMultiImageFiles(formData: FormData): File[] {
  const fromFiles = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (fromFiles.length > 0) return fromFiles;

  const alt = formData.getAll("files[]").filter((f): f is File => f instanceof File);
  return alt;
}

function mapExtractionError(err: unknown): { message: string; code: string; status: number } {
  if (err instanceof OCRProviderError) {
    return {
      message: err.message,
      code: err.code,
      status: err.code === "OPENAI_OCR_NOT_CONFIGURED" ? 503 : 400,
    };
  }
  const message = err instanceof Error ? err.message : "Text extraction failed";
  if (message.includes("too short") || message.includes("any page")) {
    return { message, code: "TEXT_NOT_READABLE", status: 400 };
  }
  return { message, code: "UPLOAD_FAILED", status: 400 };
}

function ensureImageOcrAvailable(): ReturnType<typeof fail> | null {
  if (isOpenAiOcrConfigured() || isTesseractOcrEnabled()) {
    return null;
  }
  return fail(
    "Image OCR requires OpenAI configuration. Please upload a text-based PDF or configure OPENAI_API_KEY.",
    503,
    "OPENAI_OCR_NOT_CONFIGURED"
  );
}

function isImageMime(mime: string, filename: string): boolean {
  if (mime.startsWith("image/")) return true;
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp"].includes(ext);
}

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();

    const payload = verifyToken(token);
    if (!payload) return unauthorized("Invalid token");

    const rl = checkRateLimit("upload", payload.userId, RATE_LIMITS.UPLOAD);
    if (!rl.allowed) return rateLimited();

    const formData = await req.formData();
    const familyMemberId = (formData.get("familyMemberId") as string) || null;
    const title = (formData.get("title") as string) || null;
    const uploadModeField = (formData.get("uploadMode") as string) || "single";
    const multiFiles = collectMultiImageFiles(formData);
    const singleFile = formData.get("file") as File | null;
    const isMultiImage =
      uploadModeField === "multi_image" ||
      (!singleFile && multiFiles.length > 0);

    if (familyMemberId) {
      const member = await prisma.familyMember.findUnique({
        where: { id: familyMemberId },
      });
      if (!member || member.userId !== payload.userId) {
        return validationError("Invalid family member");
      }
    }

    const uploadCheck = await canUpload(payload.userId);
    if (!uploadCheck.allowed) {
      return fail(
        uploadCheck.message ||
          "Monthly upload limit reached. Upgrade your plan to upload more reports.",
        403,
        uploadCheck.code || "UPLOAD_LIMIT_REACHED"
      );
    }

    if (isMultiImage) {
      if (multiFiles.length === 0) {
        return fail("No images provided. Use form field 'files'.", 400, "UNSUPPORTED_FILE_TYPE");
      }

      const batchValidation = validateMultiImageBatch(multiFiles);
      if (!batchValidation.valid) {
        return fail(batchValidation.error, 400, batchValidation.code);
      }

      const ocrCheck = ensureImageOcrAvailable();
      if (ocrCheck) return ocrCheck;

      const { limit, plan } = await getImagePageLimitForUser(payload.userId);
      const pageCheck = checkImagePageCount(plan, multiFiles.length);
      if (!pageCheck.allowed) {
        const planKey = normalizePlanKey(plan);
        const limitMsg =
          planKey === "free"
            ? "Free plan supports up to 3 image pages per report. Upgrade to Pro to upload more pages."
            : `Your plan supports up to ${limit} image pages per report.`;
        return failWithMeta(limitMsg, 403, {
          code: "IMAGE_PAGE_LIMIT_REACHED",
          pageLimit: limit,
          selectedPages: multiFiles.length,
          upgradeUrl: "/billing",
          plan: planKey,
        });
      }

      const fileEntries: Array<{ file: File; buffer: Buffer; pageNumber: number }> = [];
      for (let i = 0; i < multiFiles.length; i++) {
        const f = multiFiles[i];
        const arrayBuffer = await f.arrayBuffer();
        fileEntries.push({
          file: f,
          buffer: Buffer.from(arrayBuffer),
          pageNumber: i + 1,
        });
      }

      let documentId: string;
      try {
        documentId = await createMultiImageDocument({
          userId: payload.userId,
          familyMemberId,
          title,
          files: fileEntries,
        });
      } catch (err) {
        console.error("Multi-image upload error:", err);
        const mapped = mapExtractionError(err);
        return fail(mapped.message, mapped.status, mapped.code);
      }

      await incrementUploadUsage(payload.userId, documentId, req, payload.email);

      await auditUserAction(req, payload.userId, payload.email, AUDIT_ACTIONS.DOCUMENT_UPLOADED, {
        entityType: "document",
        entityId: documentId,
        metadata: {
          uploadMode: "multi_image",
          pageCount: multiFiles.length,
        },
      });

      const updated = await prisma.document.findUnique({
        where: { id: documentId },
        include: {
          report: { select: { id: true } },
          familyMember: { select: { id: true, fullName: true, relation: true } },
          pages: { orderBy: { pageNumber: "asc" } },
        },
      });

      if (!updated) return serverError("Upload failed");

      return NextResponse.json({
        ...serializeDocumentResponse(updated),
        message: "Multi-page report uploaded successfully.",
      });
    }

    const file = singleFile;
    if (!file) {
      return validationError("No file provided. Use field name 'file' or 'files' for images");
    }

    const validation = validateUploadFile(file);
    if (!validation.valid) {
      return validationError(validation.error);
    }

    if (isImageMime(file.type, file.name)) {
      const ocrCheck = ensureImageOcrAvailable();
      if (ocrCheck) return ocrCheck;
    }

    const document = await prisma.document.create({
      data: {
        userId: payload.userId,
        familyMemberId: familyMemberId || null,
        originalFilename: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadMode: "single",
        pageCount: 1,
        uploadStatus: "uploaded",
      },
    });

    let storagePath: string;
    let uploadBuffer: Buffer;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      uploadBuffer = buffer;
      const stored = await saveUploadedFile(
        buffer,
        file.name,
        payload.userId,
        document.id
      );
      storagePath = stored.storagePath;

      await prisma.document.update({
        where: { id: document.id },
        data: {
          storagePath,
          isEncrypted: stored.isEncrypted,
          encryptionIv: stored.encryptionIv,
          encryptionTag: stored.encryptionTag,
          storageVersion: stored.isEncrypted ? "v1-encrypted" : "legacy",
        },
      });
    } catch (storageErr) {
      await prisma.document.update({
        where: { id: document.id },
        data: {
          uploadStatus: "failed",
          errorMessage: "File storage failed",
        },
      });
      console.error("Storage error:", storageErr);
      const storageMessage =
        storageErr instanceof Error ? storageErr.message : "File storage failed";
      if (storageMessage.includes("FILE_ENCRYPTION_KEY")) {
        return fail(
          "File uploads are not configured on the server (missing FILE_ENCRYPTION_KEY). Contact support.",
          503,
          "STORAGE_NOT_CONFIGURED"
        );
      }
      return fail("File storage failed", 500, "STORAGE_FAILED");
    }

    await incrementUploadUsage(payload.userId, document.id, req, payload.email);

    await auditUserAction(req, payload.userId, payload.email, AUDIT_ACTIONS.DOCUMENT_UPLOADED, {
      entityType: "document",
      entityId: document.id,
      metadata: { filename: file.name, fileType: file.type, fileSize: file.size },
    });

    if (familyMemberId) {
      await auditUserAction(
        req,
        payload.userId,
        payload.email,
        AUDIT_ACTIONS.DOCUMENT_LINKED_TO_FAMILY_MEMBER,
        {
          entityType: "document",
          entityId: document.id,
          metadata: { familyMemberId },
        }
      );
    }

    await prisma.document.update({
      where: { id: document.id },
      data: { uploadStatus: "processing" },
    });

    try {
      const result = await extractTextFromDocument({
        filePath: storagePath,
        mimeType: file.type,
        originalFilename: file.name,
        fileBuffer: uploadBuffer,
      });

      await prisma.document.update({
        where: { id: document.id },
        data: {
          extractedText: result.text,
          combinedTextLength: result.text.length,
          uploadStatus: "text_extracted",
          errorMessage: result.warning || null,
        },
      });

      await auditUserAction(req, payload.userId, payload.email, AUDIT_ACTIONS.DOCUMENT_EXTRACTION_COMPLETED, {
        entityType: "document",
        entityId: document.id,
        metadata: { textLength: result.text.length },
      });

      const { onReportUploaded, onReportAwaitingSummary } = await import(
        "@/lib/email/automation-triggers"
      );
      void onReportUploaded(payload.userId, file.name);
      void onReportAwaitingSummary(payload.userId, document.id);

      const updated = await prisma.document.findUnique({
        where: { id: document.id },
        include: {
          report: { select: { id: true } },
          familyMember: { select: { id: true, fullName: true, relation: true } },
          pages: { orderBy: { pageNumber: "asc" } },
        },
      });

      return NextResponse.json(
        updated ? serializeDocumentResponse(updated) : { id: document.id }
      );
    } catch (extractErr: unknown) {
      const mapped = mapExtractionError(extractErr);
      const errorMessage = mapped.message;

      await prisma.document.update({
        where: { id: document.id },
        data: {
          uploadStatus: "failed",
          errorMessage,
        },
      });

      await auditUserAction(req, payload.userId, payload.email, AUDIT_ACTIONS.DOCUMENT_EXTRACTION_FAILED, {
        entityType: "document",
        entityId: document.id,
        metadata: { error: errorMessage.slice(0, 200), code: mapped.code },
      });

      console.error("Extraction error:", extractErr);

      const updated = await prisma.document.findUnique({
        where: { id: document.id },
        include: {
          report: { select: { id: true } },
          familyMember: { select: { id: true, fullName: true, relation: true } },
        },
      });

      return NextResponse.json(
        {
          ...(updated ? serializeDocumentResponse(updated) : { id: document.id }),
          code: mapped.code,
        },
        { status: mapped.status }
      );
    }
  } catch (err) {
    console.error("Upload error:", err);
    return fail("Upload failed. Please try again.", 500, "UPLOAD_FAILED");
  }
}
