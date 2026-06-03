import fs from "fs";
import path from "path";

const LOGO_PATH = path.join(process.cwd(), "public", "brand", "logo.png");

export function getBrandLogoPath(): string | null {
  try {
    if (fs.existsSync(LOGO_PATH)) return LOGO_PATH;
  } catch {
    /* ignore */
  }
  return null;
}

type PdfLogoOptions = {
  width?: number;
  y?: number;
};

/**
 * Draws a centered brand logo when the file exists.
 * Returns the Y position below the logo (or unchanged if skipped).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function drawPdfBrandLogo(doc: any, options: PdfLogoOptions = {}): number {
  const logoPath = getBrandLogoPath();
  const width = options.width ?? 48;
  let y = options.y ?? doc.y;

  if (!logoPath) return y;

  try {
    const x = doc.page.width / 2 - width / 2;
    doc.image(logoPath, x, y, { width, height: width, fit: [width, width] });
    y += width + 10;
    doc.y = y;
  } catch {
    /* keep text-only header */
  }

  return y;
}
