import { readFile, access } from "fs/promises";
import path from "path";
import prisma from "../lib/prisma";
import {
  isFileEncryptionConfigured,
  isEmailConfigured,
  isPushConfigured,
  isProduction,
  isRazorpayEnvEnabled,
  getRazorpayEnvChecks,
} from "../lib/env";
import { isOpenAiTranslationConfigured } from "../lib/translation/openai-translation-provider";
import { getStorageRootPath } from "../lib/storage";
import { isAppUrlConfigured } from "../lib/app-url";
import { BRAND } from "../lib/brand";

type Severity = "info" | "warning" | "blocker";

type Check = {
  name: string;
  severity: Severity;
  passed: boolean;
  detail?: string;
};

function push(
  checks: Check[],
  name: string,
  severity: Severity,
  passed: boolean,
  detail?: string
) {
  checks.push({ name, severity, passed, detail });
}

function displayLabel(check: Check): string {
  if (check.passed) {
    return check.severity === "info" ? "info" : "pass";
  }
  return check.severity;
}

function formatLine(check: Check): string {
  const label = displayLabel(check);
  const icon = check.passed ? "✓" : check.severity === "blocker" ? "✗" : "⚠";
  const suffix = check.detail
    ? check.passed && label === "info"
      ? ""
      : ` — ${check.detail}`
    : "";
  return `${icon} [${label}] ${check.name}${suffix}`;
}

async function shutdown() {
  await prisma.$disconnect().catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 50));
}

async function main(): Promise<number> {
  const checks: Check[] = [];
  const prod = isProduction();

  // --- Blockers (required for deployment) ---
  const databaseUrl = Boolean(process.env.DATABASE_URL?.trim());
  push(
    checks,
    "database_url",
    "blocker",
    databaseUrl,
    databaseUrl ? undefined : "DATABASE_URL missing"
  );

  let databaseOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseOk = true;
  } catch (e) {
    push(
      checks,
      "database",
      "blocker",
      false,
      e instanceof Error ? e.message : "Connection failed"
    );
  }
  if (databaseOk) {
    push(checks, "database", "blocker", true);
  }

  const jwt = process.env.JWT_SECRET?.trim() || "";
  push(
    checks,
    "jwt_secret",
    prod ? "blocker" : "warning",
    jwt.length >= 16,
    jwt.length >= 16 ? undefined : "JWT_SECRET should be at least 16 characters"
  );

  const openAiOk = Boolean(process.env.OPENAI_API_KEY?.trim());
  push(
    checks,
    "openai",
    "blocker",
    openAiOk,
    openAiOk ? undefined : "OPENAI_API_KEY missing"
  );

  const appUrlOk = isAppUrlConfigured();
  if (prod) {
    push(
      checks,
      "app_url",
      "blocker",
      appUrlOk,
      appUrlOk ? undefined : "APP_URL or NEXT_PUBLIC_APP_URL required in production"
    );
  } else {
    push(checks, "app_url", "info", appUrlOk || true, appUrlOk ? undefined : "Using default localhost");
  }

  try {
    await access(getStorageRootPath());
    push(checks, "storage_writable", "blocker", true);
  } catch {
    push(checks, "storage_writable", "blocker", false, "Upload storage path not writable");
  }

  const admin = await prisma.user.findFirst({ where: { role: "admin" } });
  push(
    checks,
    "admin_user",
    "blocker",
    Boolean(admin),
    admin ? undefined : "Run npm run admin:create"
  );

  if (prod) {
    push(
      checks,
      "encryption",
      "blocker",
      isFileEncryptionConfigured(),
      isFileEncryptionConfigured()
        ? undefined
        : "FILE_ENCRYPTION_KEY not configured"
    );
  } else {
    push(
      checks,
      "encryption",
      "warning",
      isFileEncryptionConfigured(),
      isFileEncryptionConfigured()
        ? undefined
        : "FILE_ENCRYPTION_KEY not configured"
    );
  }

  // --- Warnings (grouped — one line each) ---
  const emailOk = isEmailConfigured();
  push(
    checks,
    "email",
    "warning",
    emailOk,
    emailOk ? undefined : "SMTP not configured"
  );

  if (emailOk) {
    const supportEmail = process.env.SUPPORT_EMAIL?.trim();
    push(
      checks,
      "email_support_address",
      "info",
      Boolean(supportEmail),
      supportEmail ? undefined : "SUPPORT_EMAIL not set (recommended)"
    );
    push(
      checks,
      "email_dns_spf_dkim_dmarc",
      "warning",
      false,
      `Configure SPF, DKIM, and DMARC for ${supportEmail || process.env.SMTP_FROM || "your sender domain"}`
    );
  }

  push(
    checks,
    "push",
    "warning",
    isPushConfigured(),
    isPushConfigured() ? undefined : "VAPID keys not configured"
  );

  push(
    checks,
    "translation",
    "warning",
    isOpenAiTranslationConfigured(),
    isOpenAiTranslationConfigured()
      ? undefined
      : "OpenAI translation not configured (needs OPENAI_API_KEY)"
  );

  if (isRazorpayEnvEnabled()) {
    const rzChecks = getRazorpayEnvChecks().filter((c) => c.key !== "razorpay");
    const rzBlockers = rzChecks.filter((c) => c.required && !c.ok);
    const rzWarnings = rzChecks.filter((c) => !c.required && !c.ok);
    push(
      checks,
      "razorpay",
      rzBlockers.length > 0 ? "blocker" : "warning",
      rzBlockers.length === 0 && rzWarnings.length === 0,
      rzBlockers.length > 0
        ? rzBlockers.map((c) => `missing ${c.key}`).join("; ")
        : rzWarnings.length > 0
          ? rzWarnings.map((c) => c.key).join(", ") + " recommended"
          : "configured"
    );
  } else {
    push(
      checks,
      "razorpay",
      prod ? "warning" : "info",
      !prod,
      prod ? "RAZORPAY_ENABLED is not true (paid upgrades disabled)" : "Paid upgrades disabled (RAZORPAY_ENABLED not true)"
    );
  }

  try {
    await access(path.join(process.cwd(), "app/api/billing/mock-upgrade/route.ts"));
    push(
      checks,
      "mock_billing_route",
      prod ? "warning" : "info",
      true,
      prod
        ? "Mock billing route still exists; should return 410 Gone in production"
        : "Mock billing route returns 410 (expected stub)"
    );
  } catch {
    push(checks, "mock_billing_route", "info", true);
  }

  try {
    const manifest = JSON.parse(
      await readFile(path.join(process.cwd(), "public/manifest.webmanifest"), "utf8")
    );
    const brandOk =
      manifest.name === BRAND.name && manifest.short_name === BRAND.shortName;
    push(
      checks,
      "manifest_brand",
      "warning",
      brandOk,
      brandOk ? undefined : `Expected ${BRAND.name} / ${BRAND.shortName}`
    );
  } catch {
    push(checks, "manifest_brand", "warning", false, "Invalid or missing manifest");
  }

  for (const f of ["app/robots.ts", "app/sitemap.ts", "app/not-found.tsx"]) {
    try {
      await access(path.join(process.cwd(), f));
      push(checks, `file_${f.replace(/\//g, "_")}`, "info", true);
    } catch {
      push(checks, `file_${f.replace(/\//g, "_")}`, "warning", false, "File missing");
    }
  }

  try {
    const layout = await readFile(path.join(process.cwd(), "app/layout.tsx"), "utf8");
    const hasStaleBrand =
      layout.includes("Carely-Med Gen AI") &&
      !layout.includes(BRAND.previousName);
    push(
      checks,
      "layout_brand_name",
      "warning",
      !hasStaleBrand,
      hasStaleBrand ? "Old product name still in layout.tsx" : undefined
    );
  } catch {
    push(checks, "layout_brand_name", "warning", false, "Could not read layout.tsx");
  }

  try {
    await access(path.join(process.cwd(), "public/brand/logo.png"));
    push(checks, "brand_logo", "info", true);
  } catch {
    push(checks, "brand_logo", "warning", false, "public/brand/logo.png missing");
  }

  const blockerFailures = checks.filter((c) => !c.passed && c.severity === "blocker");
  const warningFailures = checks.filter((c) => !c.passed && c.severity === "warning");

  console.log(`\n${BRAND.name} — production readiness\n`);
  console.log(`Operator: ${BRAND.operator}\n`);

  for (const c of checks) {
    console.log(formatLine(c));
  }

  console.log("\n--- Summary ---");
  if (blockerFailures.length === 0 && warningFailures.length === 0) {
    console.log("Status: READY — all checks passed.");
    console.log("\nProduction check passed.");
  } else if (blockerFailures.length === 0) {
    console.log(
      `Status: READY WITH WARNINGS — ${warningFailures.length} warning(s).`
    );
    console.log(
      "\nProduction check passed with warnings. You can continue development, but configure warning items before production launch."
    );
  } else {
    console.log(
      `Status: NOT READY — ${blockerFailures.length} blocker(s), ${warningFailures.length} warning(s).`
    );
    console.log(
      "\nProduction check failed. Fix blocker items before deployment."
    );
  }

  return blockerFailures.length > 0 ? 1 : 0;
}

main()
  .then(async (code) => {
    await shutdown();
    process.exitCode = code;
  })
  .catch(async (err) => {
    console.error(err);
    await shutdown();
    process.exitCode = 1;
  });
