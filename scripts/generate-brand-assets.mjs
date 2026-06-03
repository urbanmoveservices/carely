/**
 * Copies logo.png into public assets and generates PWA / favicon sizes.
 * Run: node scripts/generate-brand-assets.mjs
 * Source: logo.png at project root (original is not deleted).
 */
import {
  copyFileSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const source = join(root, "logo.png");

if (!existsSync(source)) {
  console.error("Missing logo.png at project root:", source);
  process.exit(1);
}

const brandDir = join(root, "public", "brand");
const iconsDir = join(root, "public", "icons");
const publicDir = join(root, "public");

mkdirSync(brandDir, { recursive: true });
mkdirSync(iconsDir, { recursive: true });

const brandLogo = join(brandDir, "logo.png");
const publicLogo = join(publicDir, "logo.png");

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.warn(
    "sharp not installed — copied logo only. Run: npm install -D sharp && node scripts/generate-brand-assets.mjs"
  );
  copyFileSync(source, brandLogo);
  copyFileSync(source, publicLogo);
  console.log("Copied logo to public/brand/logo.png and public/logo.png");
  copyFileSync(source, join(iconsDir, "icon-192.png"));
  copyFileSync(source, join(iconsDir, "icon-512.png"));
  copyFileSync(source, join(iconsDir, "maskable-192.png"));
  copyFileSync(source, join(iconsDir, "maskable-512.png"));
  copyFileSync(source, join(publicDir, "apple-touch-icon.png"));
  copyFileSync(source, join(publicDir, "favicon.ico"));
  process.exit(0);
}

const BG = { r: 248, g: 250, b: 252, alpha: 1 };

async function resizeTo(file, size, maskable = false) {
  let pipeline = sharp(source).resize(size, size, {
    fit: "contain",
    background: BG,
  });

  if (maskable) {
    const inner = Math.round(size * 0.72);
    const logoBuf = await sharp(source)
      .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    pipeline = sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: BG,
      },
    }).composite([{ input: logoBuf, gravity: "center" }]);
  }

  await pipeline.png().toFile(file);
  console.log("Wrote", file.replace(root + "\\", "").replace(root + "/", ""));
}

await sharp(source)
  .resize(512, 512, { fit: "inside", withoutEnlargement: true })
  .png({ compressionLevel: 9 })
  .toFile(brandLogo);
await sharp(source)
  .resize(256, 256, { fit: "inside", withoutEnlargement: true })
  .png({ compressionLevel: 9 })
  .toFile(publicLogo);
console.log("Wrote optimized public/brand/logo.png and public/logo.png");

await resizeTo(join(iconsDir, "icon-192.png"), 192);
await resizeTo(join(iconsDir, "icon-512.png"), 512);
await resizeTo(join(iconsDir, "maskable-192.png"), 192, true);
await resizeTo(join(iconsDir, "maskable-512.png"), 512, true);
await resizeTo(join(publicDir, "apple-touch-icon.png"), 180);
await sharp(source).resize(32, 32, { fit: "contain", background: BG }).png().toFile(join(publicDir, "favicon.ico"));
console.log("Brand assets generated.");
