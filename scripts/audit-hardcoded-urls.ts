/**
 * Scan source for hardcoded URLs that should come from env helpers.
 * Run: npm run audit:urls
 */
import { readdir, readFile } from "fs/promises";
import path from "path";

const ROOT = process.cwd();

const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);

const ALLOWLIST_EXACT = new Set([
  "README.md",
  ".env.example",
  "lib/app-url.ts",
  "lib/security-headers.js",
  "next.config.js",
  "scripts/e2e-test.ts",
  "scripts/smoke-test.ts",
  "scripts/test-all.ts",
  "scripts/qa-manual-guide.ts",
  "scripts/qa-auto-verify.ts",
  "scripts/audit-hardcoded-urls.ts",
  "app/help/page.tsx",
]);

const PATTERNS: { name: string; regex: RegExp }[] = [
  { name: "vaidya-gpt.com", regex: /vaidya-gpt\.com/i },
  { name: "localhost:7111", regex: /localhost:7111/i },
  { name: "localhost:3000", regex: /localhost:3000/i },
  { name: "127.0.0.1:7111", regex: /127\.0\.0\.1:7111/i },
  { name: "192.168.", regex: /192\.168\./i },
  { name: "ngrok", regex: /ngrok/i },
  { name: "coinable-cinnamonic", regex: /coinable-cinnamonic/i },
];

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  "test-results",
  ".git",
  "storage",
]);

type Violation = { file: string; pattern: string; line: number; text: string };

function isAllowlisted(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, "/");
  if (normalized.startsWith("docs/")) return true;
  if (ALLOWLIST_EXACT.has(normalized)) return true;
  return false;
}

async function walk(dir: string, files: string[] = []): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, files);
    } else {
      const ext = path.extname(entry.name);
      if (SCAN_EXTENSIONS.has(ext)) {
        files.push(full);
      }
    }
  }
  return files;
}

async function main(): Promise<number> {
  const violations: Violation[] = [];
  const files = await walk(ROOT);

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    if (isAllowlisted(rel)) continue;

    const content = await readFile(file, "utf8");
    const lines = content.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { name, regex } of PATTERNS) {
        if (regex.test(line)) {
          violations.push({
            file: rel,
            pattern: name,
            line: i + 1,
            text: line.trim().slice(0, 120),
          });
        }
      }
    }
  }

  console.log("\nVaidya GPT — hardcoded URL audit\n");

  if (violations.length === 0) {
    console.log("PASS — no hardcoded URLs found outside allowlisted paths.\n");
    return 0;
  }

  console.log(`FAIL — ${violations.length} violation(s):\n`);
  for (const v of violations) {
    console.log(`  [${v.pattern}] ${v.file}:${v.line}`);
    console.log(`    ${v.text}\n`);
  }
  return 1;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
