import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

import { verifyToken, getTokenFromHeader } from "@/lib/jwt";

import { extractTextFromDocument } from "@/lib/document-extraction";

import { readStoredFile } from "@/lib/storage";

import { unauthorized, forbidden, notFound, fail, serverError } from "@/lib/api-response";

import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

import { runMultiImageOcrForDocument } from "@/lib/multi-image-document";

import { serializeDocumentResponse } from "@/lib/document-serialize";

import { OCRProviderError } from "@/lib/ocr/ocr-provider";



export async function POST(

  req: NextRequest,

  { params }: { params: Promise<{ id: string }> }

) {

  try {

    const token = getTokenFromHeader(req.headers.get("authorization"));

    if (!token) return unauthorized();



    const payload = verifyToken(token);

    if (!payload) return unauthorized("Invalid token");



    const { id } = await params;



    const doc = await prisma.document.findUnique({

      where: { id },

      include: { pages: true },

    });



    if (!doc) return notFound("Document not found");

    if (doc.userId !== payload.userId) return forbidden("Access denied");



    if (doc.uploadStatus === "ai_completed") {

      return fail("This document already has an AI report.", 400);

    }



    await auditUserAction(req, payload.userId, payload.email, AUDIT_ACTIONS.DOCUMENT_EXTRACTION_STARTED, {

      entityType: "document",

      entityId: id,

    });



    if (doc.uploadMode === "multi_image") {

      try {

        await runMultiImageOcrForDocument(doc.id, { onlyFailed: false });

      } catch (extractErr: unknown) {

        const errorMessage =

          extractErr instanceof OCRProviderError

            ? extractErr.message

            : extractErr instanceof Error

              ? extractErr.message

              : "Text extraction failed";

        await prisma.document.update({

          where: { id },

          data: { uploadStatus: "failed", errorMessage },

        });

        const code =
          extractErr instanceof OCRProviderError ? extractErr.code : "IMAGE_OCR_FAILED";
        return fail(errorMessage, code === "OPENAI_OCR_NOT_CONFIGURED" ? 503 : 400, code);

      }



      const updated = await prisma.document.findUnique({

        where: { id },

        include: {

          report: { select: { id: true } },

          familyMember: { select: { id: true, fullName: true, relation: true } },

          pages: { orderBy: { pageNumber: "asc" } },

        },

      });



      await auditUserAction(req, payload.userId, payload.email, AUDIT_ACTIONS.DOCUMENT_EXTRACTION_COMPLETED, {

        entityType: "document",

        entityId: id,

        metadata: { textLength: updated?.extractedText?.length ?? 0 },

      });



      return NextResponse.json(updated ? serializeDocumentResponse(updated) : { id });

    }



    if (!doc.storagePath) {

      return fail("Original file not available for reprocessing.", 400);

    }



    await prisma.document.update({

      where: { id },

      data: { uploadStatus: "processing", errorMessage: null },

    });



    try {

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



      const updated = await prisma.document.update({

        where: { id },

        data: {

          extractedText: result.text,

          combinedTextLength: result.text.length,

          uploadStatus: "text_extracted",

          errorMessage: result.warning || null,

        },

      });



      try {
        const { parseAndSaveLabValues } = await import("@/lib/lab-value-service");
        await parseAndSaveLabValues({
          userId: payload.userId,
          documentId: id,
          familyMemberId: doc.familyMemberId ?? null,
          extractedText: result.text,
        });
      } catch (parseErr) {
        console.warn("[extract-text] lab parse failed:", id, parseErr);
      }

      await auditUserAction(req, payload.userId, payload.email, AUDIT_ACTIONS.DOCUMENT_EXTRACTION_COMPLETED, {

        entityType: "document",

        entityId: id,

        metadata: { textLength: result.text.length },

      });



      const full = await prisma.document.findUnique({

        where: { id },

        include: {

          report: { select: { id: true } },

          familyMember: { select: { id: true, fullName: true, relation: true } },

        },

      });



      return NextResponse.json(full ? serializeDocumentResponse(full) : serializeDocumentResponse(updated));

    } catch (extractErr: unknown) {

      const errorMessage =

        extractErr instanceof OCRProviderError

          ? extractErr.message

          : extractErr instanceof Error

            ? extractErr.message

            : "Text extraction failed";



      await prisma.document.update({

        where: { id },

        data: { uploadStatus: "failed", errorMessage },

      });



      await auditUserAction(req, payload.userId, payload.email, AUDIT_ACTIONS.DOCUMENT_EXTRACTION_FAILED, {

        entityType: "document",

        entityId: id,

        metadata: { error: errorMessage.slice(0, 200) },

      });



      const full = await prisma.document.findUnique({

        where: { id },

        include: {

          report: { select: { id: true } },

          familyMember: { select: { id: true, fullName: true, relation: true } },

        },

      });



      return NextResponse.json(

        {

          ...(full ? serializeDocumentResponse(full) : { id: doc.id }),

          code: "IMAGE_OCR_FAILED",

        },

        { status: 400 }

      );

    }

  } catch (err) {

    console.error("Extract-text retry error:", err);

    return serverError();

  }

}

