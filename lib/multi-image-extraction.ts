import type { DocumentPage } from "@prisma/client";
import { extractTextFromImage, OCRProviderError } from "@/lib/ocr/ocr-provider";
import { readStoredFile } from "@/lib/storage";
import {
  MIN_COMBINED_TEXT_LENGTH,
  MIN_PAGE_TEXT_LENGTH,
} from "@/lib/multi-image-constants";

export type PageOcrResult = {
  pageNumber: number;
  extractedText?: string;
  status: "completed" | "failed";
  errorMessage?: string;
  provider?: "openai" | "tesseract";
};

function normalizeExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+$/gm, "")
    .trim();
}

export function formatCombinedMultiPageText(
  results: Array<{
    pageNumber: number;
    filename: string;
    text: string;
  }>
): string {
  return results
    .map(
      (p) =>
        `--- Page ${p.pageNumber}: ${p.filename} ---\n${p.text}`
    )
    .join("\n\n");
}

export async function ocrDocumentPage(
  page: Pick<
    DocumentPage,
    | "pageNumber"
    | "originalFilename"
    | "mimeType"
    | "storagePath"
    | "isEncrypted"
    | "encryptionIv"
    | "encryptionTag"
  >,
  fileBuffer?: Buffer
): Promise<PageOcrResult> {
  try {
    const buffer =
      fileBuffer ??
      (await readStoredFile(page.storagePath, {
        isEncrypted: page.isEncrypted,
        encryptionIv: page.encryptionIv,
        encryptionTag: page.encryptionTag,
      }));
    const { text, provider } = await extractTextFromImage({
      buffer,
      mimeType: page.mimeType,
      filename: page.originalFilename,
    });
    const normalized = normalizeExtractedText(text);
    if (normalized.length < MIN_PAGE_TEXT_LENGTH) {
      return {
        pageNumber: page.pageNumber,
        status: "failed",
        errorMessage: "Not enough readable text on this page",
      };
    }
    return {
      pageNumber: page.pageNumber,
      extractedText: normalized,
      status: "completed",
      provider,
    };
  } catch (err: unknown) {
    if (err instanceof OCRProviderError) {
      return {
        pageNumber: page.pageNumber,
        status: "failed",
        errorMessage: err.message.slice(0, 500),
      };
    }
    const message =
      err instanceof Error
        ? err.message
        : "Could not extract text from this image. Please upload a clearer image or PDF.";
    return {
      pageNumber: page.pageNumber,
      status: "failed",
      errorMessage: message.slice(0, 500),
    };
  }
}

export async function extractTextFromMultipleImagePages(params: {
  pages: DocumentPage[];
  buffersByPage?: Map<number, Buffer>;
}): Promise<{
  combinedText: string;
  results: PageOcrResult[];
  warning?: string;
}> {
  const sorted = [...params.pages].sort((a, b) => a.pageNumber - b.pageNumber);
  const results: PageOcrResult[] = [];
  const successful: Array<{ pageNumber: number; filename: string; text: string }> =
    [];

  for (const page of sorted) {
    const buffer = params.buffersByPage?.get(page.pageNumber);
    const result = await ocrDocumentPage(page, buffer);
    results.push(result);
    if (result.status === "completed" && result.extractedText) {
      successful.push({
        pageNumber: page.pageNumber,
        filename: page.originalFilename,
        text: result.extractedText,
      });
    }
  }

  const combinedText = formatCombinedMultiPageText(successful);
  const failedCount = results.filter((r) => r.status === "failed").length;
  let warning: string | undefined;
  if (failedCount > 0 && successful.length > 0) {
    warning = `${failedCount} page(s) could not be read. Summary uses successful pages only.`;
  }

  if (combinedText.length < MIN_COMBINED_TEXT_LENGTH) {
    if (successful.length === 0) {
      throw new Error(
        "Could not extract text from any page. Please upload clearer images or PDF."
      );
    }
    throw new Error(
      "Combined text from all pages is too short. Please upload clearer, higher-resolution images."
    );
  }

  return { combinedText, results, warning };
}

export { MIN_COMBINED_TEXT_LENGTH };
