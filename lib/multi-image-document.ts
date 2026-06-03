import prisma from "@/lib/prisma";
import { saveDocumentPageFile } from "@/lib/storage";
import {
  formatCombinedMultiPageText,
  ocrDocumentPage,
  type PageOcrResult,
} from "@/lib/multi-image-extraction";
import { MIN_COMBINED_TEXT_LENGTH } from "@/lib/multi-image-constants";
import { MULTI_IMAGE_MIME } from "@/lib/multi-image-constants";

export async function applyPageOcrResults(
  documentId: string,
  results: PageOcrResult[]
): Promise<void> {
  for (const r of results) {
    const page = await prisma.documentPage.findFirst({
      where: { documentId, pageNumber: r.pageNumber },
    });
    if (!page) continue;
    await prisma.documentPage.update({
      where: { id: page.id },
      data: {
        ocrStatus: r.status === "completed" ? "completed" : "failed",
        extractedText: r.extractedText ?? null,
        errorMessage: r.errorMessage ?? null,
      },
    });
  }
}

export async function runMultiImageOcrForDocument(
  documentId: string,
  options?: { onlyFailed?: boolean; buffersByPage?: Map<number, Buffer> }
): Promise<{
  combinedText: string;
  warning?: string;
  results: PageOcrResult[];
}> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      pages: { orderBy: { pageNumber: "asc" } },
    },
  });
  if (!doc || doc.uploadMode !== "multi_image") {
    throw new Error("Not a multi-image document");
  }

  const pages = options?.onlyFailed
    ? doc.pages.filter((p) => p.ocrStatus === "failed" || p.ocrStatus === "pending")
    : doc.pages;

  if (pages.length === 0) {
    throw new Error("No pages to process");
  }

  await prisma.document.update({
    where: { id: documentId },
    data: { uploadStatus: "processing", errorMessage: null },
  });

  for (const p of pages) {
    await prisma.documentPage.update({
      where: { id: p.id },
      data: { ocrStatus: "processing" },
    });
  }

  const results: PageOcrResult[] = [];
  for (const page of pages) {
    const buffer = options?.buffersByPage?.get(page.pageNumber);
    results.push(await ocrDocumentPage(page, buffer));
  }

  await applyPageOcrResults(documentId, results);

  const refreshed = await prisma.documentPage.findMany({
    where: { documentId },
    orderBy: { pageNumber: "asc" },
  });

  const successful = refreshed
    .filter((p) => p.ocrStatus === "completed" && p.extractedText)
    .map((p) => ({
      pageNumber: p.pageNumber,
      filename: p.originalFilename,
      text: p.extractedText!,
    }));

  const combinedText = formatCombinedMultiPageText(successful);
  const failedCount = results.filter((r) => r.status === "failed").length;
  const warning =
    failedCount > 0 && successful.length > 0
      ? `${failedCount} page(s) could not be read. Summary uses successful pages only.`
      : undefined;

  if (combinedText.length < MIN_COMBINED_TEXT_LENGTH) {
    throw new Error(
      "Combined text from all pages is too short. Please upload clearer images."
    );
  }

  const partial = failedCount > 0;

  await prisma.document.update({
    where: { id: documentId },
    data: {
      extractedText: combinedText,
      combinedTextLength: combinedText.length,
      uploadStatus: "text_extracted",
      errorMessage: partial
        ? warning || `${failedCount} page(s) failed OCR`
        : null,
    },
  });

  return { combinedText, warning, results };
}

export async function createMultiImageDocument(params: {
  userId: string;
  familyMemberId: string | null;
  title: string | null;
  files: Array<{ file: File; buffer: Buffer; pageNumber: number }>;
}): Promise<string> {
  const totalSize = params.files.reduce((s, f) => s + f.file.size, 0);
  const displayName =
    params.title?.trim() || "Multi-page image report";

  const document = await prisma.document.create({
    data: {
      userId: params.userId,
      familyMemberId: params.familyMemberId,
      originalFilename: displayName,
      fileType: MULTI_IMAGE_MIME,
      fileSize: totalSize,
      uploadMode: "multi_image",
      pageCount: params.files.length,
      uploadStatus: "uploaded",
      storagePath: null,
    },
  });

  const buffersByPage = new Map<number, Buffer>();

  for (const { file, buffer, pageNumber } of params.files) {
    const stored = await saveDocumentPageFile(
      buffer,
      file.name,
      params.userId,
      document.id,
      pageNumber
    );
    buffersByPage.set(pageNumber, buffer);
    await prisma.documentPage.create({
      data: {
        documentId: document.id,
        userId: params.userId,
        pageNumber,
        originalFilename: file.name,
        mimeType: file.type || "image/jpeg",
        fileSize: file.size,
        storagePath: stored.storagePath,
        isEncrypted: stored.isEncrypted,
        encryptionIv: stored.encryptionIv,
        encryptionTag: stored.encryptionTag,
        ocrStatus: "pending",
      },
    });
  }

  try {
    await runMultiImageOcrForDocument(document.id, { buffersByPage });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Multi-page OCR failed";
    await prisma.document.update({
      where: { id: document.id },
      data: { uploadStatus: "failed", errorMessage: message.slice(0, 500) },
    });
    throw err;
  }
  return document.id;
}

export function serializeDocumentPages(
  pages: Array<{
    id: string;
    pageNumber: number;
    originalFilename: string;
    mimeType: string;
    fileSize: number;
    ocrStatus: string;
    errorMessage: string | null;
    extractedText: string | null;
  }>
) {
  return pages.map((p) => ({
    id: p.id,
    page_number: p.pageNumber,
    original_filename: p.originalFilename,
    mime_type: p.mimeType,
    file_size: p.fileSize,
    ocr_status: p.ocrStatus,
    ocr_provider: p.ocrStatus === "completed" ? "openai" : null,
    error_message: p.errorMessage,
    extracted_text_length: p.extractedText?.length ?? 0,
  }));
}
