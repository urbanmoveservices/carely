import path from "path";
import { access } from "fs/promises";

function tesseractPaths() {
  const root = /* turbopackIgnore: true */ process.cwd();
  const langPath =
    process.env.TESSERACT_LANG_PATH?.trim() ||
    path.join(root, "node_modules", "tesseract.js-core");
  return {
    workerPath: path.join(
      root,
      "node_modules",
      "tesseract.js",
      "src",
      "worker-script",
      "node",
      "index.js"
    ),
    corePath: path.join(
      root,
      "node_modules",
      "tesseract.js-core",
      "tesseract-core-simd.wasm.js"
    ),
    langPath,
  };
}

/** Tesseract is off unless ENABLE_TESSERACT_OCR=true */
export function isTesseractOcrEnabled(): boolean {
  return process.env.ENABLE_TESSERACT_OCR === "true";
}

async function langDataAvailable(langPath: string): Promise<boolean> {
  try {
    await access(path.join(langPath, "eng.traineddata.gz"));
    return true;
  } catch {
    try {
      await access(path.join(langPath, "eng.traineddata"));
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Optional fallback OCR. Never throws uncaught — returns empty string on failure.
 */
export async function extractTextWithTesseractSafe(
  buffer: Buffer
): Promise<{ text: string; error?: string }> {
  if (!isTesseractOcrEnabled()) {
    return { text: "", error: "Tesseract OCR is disabled" };
  }

  try {
    const paths = tesseractPaths();
    const hasLang = await langDataAvailable(paths.langPath);
    if (!hasLang) {
      return {
        text: "",
        error: "Tesseract language data is missing.",
      };
    }

    const { createWorker } = await import("tesseract.js");
    let worker: Awaited<ReturnType<typeof createWorker>> | null = null;

    try {
      worker = await createWorker("eng", 1, {
        workerPath: paths.workerPath,
        corePath: paths.corePath,
        langPath: paths.langPath,
        logger: () => {},
      });

      const {
        data: { text },
      } = await worker.recognize(buffer);
      return { text: (text || "").trim() };
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch {
          // ignore terminate errors
        }
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { text: "", error: message.slice(0, 300) };
  }
}
