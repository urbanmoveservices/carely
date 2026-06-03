import { readFile } from "fs/promises";
import {
  extractTextFromImage,
  OCRProviderError,
} from "@/lib/ocr/ocr-provider";

interface ExtractionResult {
  text: string;
  method: "pdf" | "docx" | "ocr" | "mock" | "unknown";
  warning?: string;
}

interface ExtractionParams {
  filePath: string;
  mimeType: string;
  originalFilename: string;
  /** Decrypted file bytes when storage is encrypted */
  fileBuffer?: Buffer;
}

const MIN_TEXT_LENGTH = 30;
const isDev = process.env.NODE_ENV === "development";

function devLog(...args: unknown[]) {
  if (isDev) console.log("[extraction]", ...args);
}

export async function extractTextFromDocument(
  params: ExtractionParams
): Promise<ExtractionResult> {
  const { filePath, mimeType, originalFilename, fileBuffer } = params;

  devLog("Starting extraction", {
    file: originalFilename,
    mimeType,
    hasBuffer: Boolean(fileBuffer),
  });

  if (mimeType === "application/pdf") {
    return extractTextFromPdf(filePath, originalFilename, fileBuffer);
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return extractTextFromDocx(filePath, fileBuffer);
  }

  if (
    mimeType === "image/jpeg" ||
    mimeType === "image/png" ||
    mimeType === "image/webp"
  ) {
    return extractTextFromImageFile(filePath, fileBuffer);
  }

  throw new Error(
    "This document type is uploaded but text extraction is not available yet."
  );
}

async function extractTextFromPdf(
  filePath: string,
  originalFilename: string,
  fileBuffer?: Buffer
): Promise<ExtractionResult> {
  let buffer: Buffer;
  try {
    buffer = fileBuffer ?? (await readFile(filePath));
  } catch (readErr: any) {
    devLog("Failed to read PDF file", readErr.message);
    throw new Error(
      "Could not read the uploaded file. It may have been moved or deleted."
    );
  }

  devLog("PDF file size:", buffer.length, "bytes");

  if (buffer.length < 100) {
    throw new Error(
      "This file is too small to be a valid PDF. Please upload a proper PDF document."
    );
  }

  // Check PDF magic bytes
  const header = buffer.subarray(0, 5).toString("ascii");
  if (!header.startsWith("%PDF")) {
    devLog("Not a valid PDF header:", header);
    throw new Error(
      "This file does not appear to be a valid PDF. Please upload a proper PDF document."
    );
  }

  try {
    // Import the parser directly — pdf-parse/index.js runs debug code when bundled
    // (reads test/data/05-versions-space.pdf) because module.parent is undefined.
    const mod = await import("pdf-parse/lib/pdf-parse.js");
    const pdfParse = (mod as any).default || mod;

    let data: any;
    try {
      data = await pdfParse(buffer, {
        max: 0, // no page limit
      });
    } catch (parseErr: any) {
      devLog("pdf-parse threw:", parseErr.name, parseErr.message);

      const msg = (parseErr.message || "").toLowerCase();

      if (
        msg.includes("password") ||
        msg.includes("encrypt") ||
        msg.includes("protected")
      ) {
        throw new Error(
          "This PDF appears to be password-protected or locked. Please upload an unlocked copy."
        );
      }

      if (
        msg.includes("invalid") ||
        msg.includes("corrupt") ||
        msg.includes("damaged")
      ) {
        throw new Error(
          "This PDF appears to be corrupted or damaged. Please upload a valid PDF file."
        );
      }

      throw new Error(
        "Could not process this PDF. It may be corrupted, locked, or in an unsupported format. " +
          "Please try uploading a different version or use JPG/PNG for scanned reports."
      );
    }

    devLog("pdf-parse result:", {
      pages: data.numpages,
      textLength: data.text?.length ?? 0,
      infoTitle: data.info?.Title,
    });

    const text = normalizeExtractedText(data.text || "");

    if (text.length < MIN_TEXT_LENGTH) {
      devLog(
        "Extracted text too short:",
        text.length,
        "chars. Likely scanned PDF."
      );

      throw new Error(
        "This PDF appears to be scanned or image-based — no readable text could be extracted. " +
          "Please upload a clearer text-based PDF, or use JPG/PNG upload for OCR."
      );
    }

    return { text, method: "pdf" };
  } catch (err: any) {
    // Re-throw our own user-friendly errors
    if (
      err.message.includes("password-protected") ||
      err.message.includes("scanned or image-based") ||
      err.message.includes("corrupted") ||
      err.message.includes("too small") ||
      err.message.includes("not appear to be a valid") ||
      err.message.includes("Could not process") ||
      err.message.includes("Could not read the uploaded")
    ) {
      throw err;
    }

    devLog("Unexpected PDF extraction error:", err.name, err.message);

    throw new Error(
      "Could not extract text from this PDF. The file may be scanned, locked, or image-based. " +
        "Try uploading the report as JPG or PNG for OCR, or use a text-based PDF."
    );
  }
}

/**
 * Placeholder for future scanned-PDF OCR support.
 * Currently not wired into the main pipeline — returns a controlled error.
 */
export async function extractTextFromScannedPdf(
  _filePath: string
): Promise<string> {
  throw new Error(
    "Scanned PDF OCR is not enabled yet. Please upload the report as JPG or PNG for OCR."
  );
}

async function extractTextFromDocx(
  filePath: string,
  fileBuffer?: Buffer
): Promise<ExtractionResult> {
  try {
    const mammoth = await import("mammoth");
    const result = fileBuffer
      ? await mammoth.extractRawText({ buffer: fileBuffer })
      : await mammoth.extractRawText({ path: filePath });
    const text = normalizeExtractedText(result.value);

    devLog("DOCX extraction:", { textLength: text.length });

    if (text.length < MIN_TEXT_LENGTH) {
      throw new Error(
        "This DOCX file contains very little readable text. " +
          "Please upload a document with more content."
      );
    }

    const warning =
      result.messages.length > 0
        ? result.messages.map((m: any) => m.message).join("; ")
        : undefined;
    return { text, method: "docx", warning };
  } catch (err: any) {
    if (
      err.message?.includes("very little readable text") ||
      err.message?.includes("DOCX file")
    ) {
      throw err;
    }
    devLog("DOCX extraction error:", err.name, err.message);
    throw new Error(
      "Could not read this DOCX file. Please upload a valid Word document."
    );
  }
}

export async function extractTextFromImageBuffer(
  buffer: Buffer,
  mimeType: string,
  filename?: string
): Promise<ExtractionResult> {
  try {
    devLog("Starting OCR for image", filename);
    const { text: rawText } = await extractTextFromImage({
      buffer,
      mimeType,
      filename: filename || "image",
    });
    const text = normalizeExtractedText(rawText);
    if (text.length < MIN_TEXT_LENGTH) {
      throw new OCRProviderError(
        "Could not extract enough readable text from this image. Please upload a clearer, higher-resolution medical report image.",
        "TEXT_NOT_READABLE"
      );
    }
    return { text, method: "ocr" };
  } catch (err: unknown) {
    if (err instanceof OCRProviderError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : "Image OCR failed";
    if (
      message.includes("enough readable text") ||
      message.includes("clearer")
    ) {
      throw err;
    }
    devLog("OCR error:", message);
    throw new OCRProviderError(
      "Could not extract text from this image. Please upload a clearer image or PDF.",
      "IMAGE_OCR_FAILED"
    );
  }
}

async function extractTextFromImageFile(
  filePath: string,
  fileBuffer?: Buffer
): Promise<ExtractionResult> {
  const buffer = fileBuffer ?? (await readFile(filePath));
  const mime =
    filePath.endsWith(".png")
      ? "image/png"
      : filePath.endsWith(".webp")
        ? "image/webp"
        : "image/jpeg";
  return extractTextFromImageBuffer(buffer, mime, filePath);
}

function normalizeExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+$/gm, "")
    .trim();
}
