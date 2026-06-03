import { extractTextWithOpenAiVision } from "./openai-vision-ocr";
import { extractTextWithTesseractSafe, isTesseractOcrEnabled } from "./tesseract-ocr";

export type OcrProviderName = "openai" | "tesseract";

const MIN_OCR_TEXT_LENGTH = 20;

export class OCRProviderError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "OCRProviderError";
    this.code = code;
  }
}

/** @deprecated use OCRProviderError */
export class ImageOcrError extends OCRProviderError {
  constructor(message: string) {
    super(message, "IMAGE_OCR_FAILED");
  }
}

const isDev = process.env.NODE_ENV === "development";

function devLog(...args: unknown[]) {
  if (isDev) console.log("[ocr]", ...args);
}

export function isOpenAiOcrConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function getConfiguredPrimaryProvider(): OcrProviderName {
  const env = process.env.OPENAI_IMAGE_OCR_PROVIDER?.trim().toLowerCase();
  if (env === "tesseract") return "tesseract";
  return "openai";
}

async function tryOpenAiVision(
  buffer: Buffer,
  mimeType: string
): Promise<{ text: string } | { error: string }> {
  if (!isOpenAiOcrConfigured()) {
    return { error: "OPENAI_API_KEY not configured" };
  }
  try {
    devLog("Trying OpenAI Vision OCR");
    const text = (await extractTextWithOpenAiVision(buffer, mimeType)).trim();
    return { text };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    devLog("OpenAI Vision failed:", message);
    return { error: message };
  }
}

async function tryTesseract(buffer: Buffer): Promise<{ text: string } | { error: string }> {
  if (!isTesseractOcrEnabled()) {
    return { error: "Tesseract OCR is disabled (ENABLE_TESSERACT_OCR=false)" };
  }
  devLog("Trying Tesseract OCR (optional fallback)");
  const result = await extractTextWithTesseractSafe(buffer);
  if (result.error && !result.text) {
    return { error: result.error };
  }
  return { text: result.text };
}

/**
 * Primary image OCR: OpenAI Vision first, Tesseract only if enabled and OpenAI fails.
 */
export async function extractTextFromImage(params: {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}): Promise<{
  text: string;
  provider: OcrProviderName;
  confidence?: number;
}> {
  const { buffer, mimeType } = params;
  const primary = getConfiguredPrimaryProvider();
  const errors: string[] = [];

  const attemptOpenAi = async (): Promise<boolean> => {
    const result = await tryOpenAiVision(buffer, mimeType);
    if ("text" in result && result.text.length >= MIN_OCR_TEXT_LENGTH) {
      return true;
    }
    if ("text" in result && result.text.length > 0) {
      errors.push("OpenAI Vision returned insufficient text");
    } else if ("error" in result) {
      errors.push(result.error);
    }
    return false;
  };

  const attemptTesseract = async (): Promise<boolean> => {
    const result = await tryTesseract(buffer);
    if ("text" in result && result.text.length >= MIN_OCR_TEXT_LENGTH) {
      return true;
    }
    if ("error" in result) {
      errors.push(result.error);
    } else {
      errors.push("Tesseract returned insufficient text");
    }
    return false;
  };

  if (primary === "openai") {
    if (!isOpenAiOcrConfigured()) {
      throw new OCRProviderError(
        "Image OCR requires OpenAI configuration. Please upload a text-based PDF or configure OPENAI_API_KEY.",
        "OPENAI_OCR_NOT_CONFIGURED"
      );
    }

    const openAi = await tryOpenAiVision(buffer, mimeType);
    if ("text" in openAi && openAi.text.length >= MIN_OCR_TEXT_LENGTH) {
      return { text: openAi.text, provider: "openai" };
    }
    if ("text" in openAi && openAi.text.length > 0) {
      errors.push("OpenAI Vision returned insufficient text");
    } else if ("error" in openAi) {
      errors.push(openAi.error);
    }

    if (isTesseractOcrEnabled()) {
      const tess = await tryTesseract(buffer);
      if ("text" in tess && tess.text.length >= MIN_OCR_TEXT_LENGTH) {
        return { text: tess.text, provider: "tesseract" };
      }
      if ("error" in tess) errors.push(tess.error);
    }
  } else {
    if (isTesseractOcrEnabled()) {
      const tess = await tryTesseract(buffer);
      if ("text" in tess && tess.text.length >= MIN_OCR_TEXT_LENGTH) {
        return { text: tess.text, provider: "tesseract" };
      }
      if ("error" in tess) errors.push(tess.error);
    }

    if (isOpenAiOcrConfigured()) {
      const openAi = await tryOpenAiVision(buffer, mimeType);
      if ("text" in openAi && openAi.text.length >= MIN_OCR_TEXT_LENGTH) {
        return { text: openAi.text, provider: "openai" };
      }
      if ("error" in openAi) errors.push(openAi.error);
    } else {
      errors.push("OPENAI_API_KEY not configured");
    }
  }

  if (!isOpenAiOcrConfigured() && !isTesseractOcrEnabled()) {
    throw new OCRProviderError(
      "Image OCR requires OpenAI configuration. Please upload a text-based PDF or configure OPENAI_API_KEY.",
      "OPENAI_OCR_NOT_CONFIGURED"
    );
  }

  devLog("OCR failed:", errors.join("; "));

  throw new OCRProviderError(
    "Could not extract text from this image. Please upload a clearer image or PDF.",
    "IMAGE_OCR_FAILED"
  );
}

/** Backward-compatible wrapper */
export async function extractTextFromImageBuffer(
  buffer: Buffer,
  mimeType: string,
  filename?: string
): Promise<{ text: string; method: "openai_vision" | "tesseract" }> {
  const result = await extractTextFromImage({
    buffer,
    mimeType,
    filename: filename || "image",
  });
  return {
    text: result.text,
    method: result.provider === "openai" ? "openai_vision" : "tesseract",
  };
}
