import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { unauthorized, forbidden, notFound, fail, serverError } from "@/lib/api-response";
import { runMultiImageOcrForDocument } from "@/lib/multi-image-document";
import { serializeDocumentResponse } from "@/lib/document-serialize";
import { extractTextFromDocument } from "@/lib/document-extraction";
import { readStoredFile } from "@/lib/storage";
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
    const body = await req.json().catch(() => ({}));
    const onlyFailed = Boolean((body as { onlyFailed?: boolean }).onlyFailed);

    const doc = await prisma.document.findUnique({
      where: { id },
      include: { pages: { orderBy: { pageNumber: "asc" } } },
    });

    if (!doc) return notFound("Document not found");
    if (doc.userId !== payload.userId) return forbidden("Access denied");

    if (doc.uploadMode === "multi_image") {
      try {
        await runMultiImageOcrForDocument(doc.id, { onlyFailed });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "OCR failed";
        await prisma.document.update({
          where: { id },
          data: { uploadStatus: "failed", errorMessage: message.slice(0, 500) },
        });
        const code = err instanceof OCRProviderError ? err.code : "IMAGE_OCR_FAILED";
        return fail(message, code === "OPENAI_OCR_NOT_CONFIGURED" ? 503 : 400, code);
      }

      const updated = await prisma.document.findUnique({
        where: { id },
        include: {
          report: { select: { id: true } },
          familyMember: { select: { id: true, fullName: true, relation: true } },
          pages: { orderBy: { pageNumber: "asc" } },
        },
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

      await prisma.document.update({
        where: { id },
        data: {
          extractedText: result.text,
          combinedTextLength: result.text.length,
          uploadStatus: "text_extracted",
          errorMessage: result.warning || null,
        },
      });
    } catch (err) {
      const message =
        err instanceof OCRProviderError
          ? err.message
          : err instanceof Error
            ? err.message
            : "OCR failed";
      await prisma.document.update({
        where: { id },
        data: { uploadStatus: "failed", errorMessage: message },
      });
      return fail(message, 400, "IMAGE_OCR_FAILED");
    }

    const updated = await prisma.document.findUnique({
      where: { id },
      include: {
        report: { select: { id: true } },
        familyMember: { select: { id: true, fullName: true, relation: true } },
      },
    });

    return NextResponse.json(updated ? serializeDocumentResponse(updated) : { id });
  } catch (err) {
    console.error("Rerun OCR error:", err);
    return serverError();
  }
}
