/**
 * Local smoke tests — no browser required.
 * Run: npm run test:smoke
 */
import { readFile, access } from "fs/promises";
import path from "path";
import prisma from "../lib/prisma";
import { validateEnv } from "../lib/env";
import { BRAND } from "../lib/brand";

type Row = { name: string; ok: boolean; detail?: string };

const rows: Row[] = [];

function pass(name: string, detail?: string) {
  rows.push({ name, ok: true, detail });
}

function fail(name: string, detail?: string) {
  rows.push({ name, ok: false, detail });
}

async function fileExists(rel: string) {
  try {
    await access(path.join(process.cwd(), rel));
    return true;
  } catch {
    return false;
  }
}

async function fetchWithTimeout(
  url: string,
  timeoutMs = 8000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    });
    await res.arrayBuffer().catch(() => {});
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function shutdown() {
  await prisma.$disconnect().catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 50));
}

async function main(): Promise<number> {
  console.log(`\n${BRAND.name} — smoke test\n`);

  try {
    await prisma.$queryRaw`SELECT 1`;
    pass("database_connect");
  } catch (e) {
    fail("database_connect", e instanceof Error ? e.message : "failed");
  }

  const tables = [
    ["user", () => prisma.user.count()],
    ["document", () => prisma.document.count()],
    ["report", () => prisma.report.count()],
    ["qaChecklistItem", () => prisma.qaChecklistItem.count()],
    ["errorLog", () => prisma.errorLog.count()],
  ] as const;

  for (const [name, fn] of tables) {
    try {
      await fn();
      pass(`prisma_${name}`);
    } catch (e) {
      fail(`prisma_${name}`, e instanceof Error ? e.message : "missing delegate");
    }
  }

  try {
    const admin = await prisma.user.findFirst({ where: { role: "admin" } });
    admin ? pass("admin_user_exists") : fail("admin_user_exists", "Run npm run admin:create");
  } catch {
    fail("admin_user_exists");
  }

  process.env.OPENAI_API_KEY?.trim()
    ? pass("openai_api_key")
    : fail("openai_api_key", "OPENAI_API_KEY not set");

  const envFails = validateEnv().filter((c) => c.required && !c.ok);
  envFails.length === 0
    ? pass("env_validation")
    : fail("env_validation", envFails.map((f) => f.key).join(", "));

  try {
    const raw = await readFile(
      path.join(process.cwd(), "public/manifest.webmanifest"),
      "utf8"
    );
    const m = JSON.parse(raw) as { name?: string };
    m.name === BRAND.name
      ? pass("manifest_json", m.name)
      : fail("manifest_json", `name=${m.name}`);
  } catch (e) {
    fail("manifest_json", e instanceof Error ? e.message : "invalid");
  }

  for (const f of [
    "public/brand/logo.png",
    "public/icons/icon-192.png",
    "public/icons/icon-512.png",
    "public/favicon.ico",
  ]) {
    (await fileExists(f)) ? pass(`asset_${f}`) : fail(`asset_${f}`, "missing");
  }

  const base =
    process.env.SMOKE_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:7111";
  const endpoints = [
    ["/api/billing/plans", true],
    ["/api/billing/razorpay/status", true],
    ["/api/profile", false],
    ["/api/auth/me", false],
    ["/manifest.webmanifest", true],
  ] as const;

  for (const [ep, expectOk] of endpoints) {
    const key = `http${ep.replace(/\//g, "_")}`;
    try {
      const res = await fetchWithTimeout(`${base}${ep}`);
      if (ep === "/api/auth/me") {
        res.status === 401
          ? pass("api_auth_me_unauthorized")
          : fail("api_auth_me_unauthorized", `status ${res.status}`);
      } else if (ep === "/api/profile") {
        res.status === 401
          ? pass("api_profile_unauthorized")
          : fail("api_profile_unauthorized", `status ${res.status}`);
      } else if (expectOk && res.ok) {
        pass(key);
      } else if (!res.ok) {
        fail(key, `status ${res.status}`);
      }
    } catch {
      fail(key, `Is dev server running on ${base}?`);
    }
  }

  try {
    const rzRes = await fetch(`${base}/api/billing/razorpay/status`, {
      cache: "no-store",
    });
    if (rzRes.ok) {
      const body = (await rzRes.json()) as {
        enabled?: boolean;
        configured?: boolean;
        currency?: string;
      };
      typeof body.enabled === "boolean" &&
      typeof body.configured === "boolean" &&
      body.currency
        ? pass("api_billing_razorpay_status_shape")
        : fail("api_billing_razorpay_status_shape", "invalid JSON shape");
    } else {
      fail("api_billing_razorpay_status_shape", `status ${rzRes.status}`);
    }
  } catch {
    fail("api_billing_razorpay_status_shape", `Is dev server running on ${base}?`);
  }

  const demoEmail = process.env.DEMO_USER_EMAIL || "demo@carelymed.ai";
  try {
    const demo = await prisma.user.findUnique({ where: { email: demoEmail } });
    demo
      ? pass("demo_user_optional", demoEmail)
      : pass("demo_user_optional", "not seeded (optional)");
  } catch {
    fail("demo_user_optional");
  }

  const maxName = Math.max(...rows.map((r) => r.name.length), 4);
  console.log(`${"CHECK".padEnd(maxName)}  RESULT  DETAIL`);
  console.log("-".repeat(maxName + 40));
  for (const r of rows) {
    console.log(
      `${r.name.padEnd(maxName)}  ${r.ok ? "PASS" : "FAIL"}    ${r.detail ?? ""}`
    );
  }

  const failedCount = rows.filter((r) => !r.ok).length;
  console.log(
    failedCount === 0
      ? `\nAll ${rows.length} checks passed.\n`
      : `\n${failedCount} of ${rows.length} check(s) failed.\n`
  );

  return failedCount > 0 ? 1 : 0;
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
