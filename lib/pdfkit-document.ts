import fs from "fs";
import path from "path";
import { createRequire } from "node:module";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfDocumentCtor = new (options?: Record<string, unknown>) => any;

let cachedCtor: PdfDocumentCtor | null = null;

function pdfKitDataDir(): string {
  return path.join(process.cwd(), "node_modules", "pdfkit", "js", "data");
}

export function assertPdfKitFontsAvailable(): void {
  const helvetica = path.join(pdfKitDataDir(), "Helvetica.afm");
  if (!fs.existsSync(helvetica)) {
    throw new Error(
      "PDFKit font data missing. Run npm install and ensure pdfkit is installed."
    );
  }
}

/**
 * Load PDFKit from node_modules (not a broken Turbopack bundle path).
 */
export async function loadPdfDocumentConstructor(): Promise<PdfDocumentCtor> {
  if (cachedCtor) return cachedCtor;
  assertPdfKitFontsAvailable();
  const require = createRequire(path.join(process.cwd(), "package.json"));
  const mod = require("pdfkit") as { default?: PdfDocumentCtor } & PdfDocumentCtor;
  cachedCtor = (mod.default ?? mod) as PdfDocumentCtor;
  return cachedCtor;
}
