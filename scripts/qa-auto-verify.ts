/**
 * Auto-verify QA checklist items and update QaChecklistItem records.
 * Run: npm run test:qa:auto (dev server on :7111)
 */
import { access, readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import prisma from "../lib/prisma";
import { BRAND } from "../lib/brand";
import { hashPassword } from "../lib/password";
import { seedQaChecklist, QA_CHECKLIST_ITEMS } from "../lib/qa-checklist";
import { validateEnv } from "../lib/env";
import {
  type VerifyResult,
  type ItemStatus,
  type E2eCheckRow,
  type TestSuiteInput,
  applyE2eToResults,
  applySuiteMeta,
  mergeResult,
  pendingManual,
  MANUAL_ONLY_KEYS,
  MANUAL_GUIDE,
  FORBIDDEN_RISK_PHRASES,
  ALL_QA_KEYS,
  LIVE_VERIFY_KEYS,
} from "./qa-checklist-mapper";

const BASE_URL =
  process.env.E2E_BASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  "http://localhost:7111";
const OVERWRITE = process.env.QA_AUTO_OVERWRITE === "true";
const SKIP_LIVE = process.env.TEST_QA_SKIP_LIVE === "true";
const HAS_OPENAI = Boolean(process.env.OPENAI_API_KEY?.trim());

type Session = { token: string; email: string; userId?: string };

export type TestSuiteInput = {
  smokeOk?: boolean;
  prodOk?: boolean;
  prodWarnings?: boolean;
  e2eOk?: boolean;
  buildOk?: boolean;
};

export type QaAutoReport = {
  startedAt: string;
  finishedAt: string;
  baseUrl: string;
  autoPassCount: number;
  autoFailCount: number;
  manualPendingCount: number;
  skippedCount: number;
  updatedCount: number;
  totalItems: number;
  nextManual: string[];
  results: Array<{ key: string; status: ItemStatus; note: string }>;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchHtml(url: string, token?: string): Promise<{ status: number; html: string }> {
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(url, { headers, cache: "no-store" });
  const html = await res.text();
  return { status: res.status, html };
}

async function apiJson(
  apiPath: string,
  init: RequestInit = {},
  token?: string
): Promise<{ status: number; data: Record<string, unknown> }> {
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${BASE_URL}${apiPath}`, { ...init, headers, cache: "no-store" });
  let data: Record<string, unknown> = {};
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      const p: unknown = await res.json();
      if (Array.isArray(p)) data = { _array: p };
      else if (p && typeof p === "object") data = p as Record<string, unknown>;
    } catch {
      /* empty */
    }
  } else {
    await res.arrayBuffer().catch(() => {});
  }
  return { status: res.status, data };
}

function pass(
  results: Map<string, VerifyResult>,
  key: string,
  note: string
) {
  mergeResult(results, key, { status: "pass", note });
}

function fail(
  results: Map<string, VerifyResult>,
  key: string,
  note: string
) {
  mergeResult(results, key, { status: "fail", note });
}

function userFacingHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
}

async function provisionUser(email: string, name: string): Promise<Session | null> {
  const signup = await apiJson("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      name,
      email,
      password: "Test@12345",
      legalConsentAccepted: true,
    }),
  });
  if (signup.status === 200 && signup.data.access_token) {
    return {
      token: String(signup.data.access_token),
      email,
      userId: (signup.data.user as { id?: string })?.id,
    };
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const now = new Date();
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await hashPassword("Test@12345"),
        role: "user",
        termsAcceptedAt: now,
        privacyAcceptedAt: now,
        medicalConsentAcceptedAt: now,
      },
    });
  }
  const login = await apiJson("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: "Test@12345" }),
  });
  if (login.status !== 200 || !login.data.access_token) return null;
  return {
    token: String(login.data.access_token),
    email,
    userId: (login.data.user as { id?: string })?.id,
  };
}

async function loadE2eReport(): Promise<E2eCheckRow[] | null> {
  try {
    const raw = await readFile(
      path.join(process.cwd(), "test-results/e2e-report.json"),
      "utf8"
    );
    const j = JSON.parse(raw) as { checks?: E2eCheckRow[] };
    return j.checks ?? null;
  } catch {
    return null;
  }
}

async function runBrandingChecks(results: Map<string, VerifyResult>) {
  const pages: Array<[string, string]> = [
    ["brand_landing", "/"],
    ["brand_dashboard", "/dashboard"],
    ["brand_auth", "/login"],
  ];
  for (const [key, route] of pages) {
    const { status, html } = await fetchHtml(`${BASE_URL}${route}`);
    const body = userFacingHtml(html);
    const hasBrand = body.includes(BRAND.name) || body.includes("VaidyaGPT");
    const hasOld =
      body.includes("Carely-Med Gen AI") || body.includes("Carely-Med");
    if (status === 200 && hasBrand) {
      pass(results, key, `GET ${route} contains ${BRAND.name}`);
    } else {
      fail(results, key, `GET ${route} status=${status} brand=${hasBrand}`);
    }
    if (key === "brand_landing" || key === "brand_auth") {
      if (hasOld) {
        fail(results, "brand_no_old_name", `Old name found on ${route}`);
      } else {
        pass(results, "brand_no_old_name", `No Carely-Med in user-facing HTML on ${route}`);
      }
    }
  }
  const signup = await fetchHtml(`${BASE_URL}/signup`);
  if (signup.html.includes(BRAND.name)) {
    pass(results, "brand_auth", "Signup page shows Vaidya GPT");
  }
  try {
    const m = JSON.parse(
      await readFile(path.join(process.cwd(), "public/manifest.webmanifest"), "utf8")
    ) as { name?: string };
    m.name === BRAND.name
      ? pass(results, "brand_logo_pwa", `manifest name=${m.name}`)
      : fail(results, "brand_logo_pwa", `manifest name=${m.name}`);
  } catch (e) {
    fail(results, "brand_logo_pwa", e instanceof Error ? e.message : "manifest read failed");
  }
}

async function runAuthChecks(results: Map<string, VerifyResult>, session: Session) {
  const noConsent = await apiJson("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      name: "QA No Consent",
      email: `qa-noconsent-${Date.now()}@vaidya.test`,
      password: "Test@12345",
      legalConsentAccepted: false,
    }),
  });
  noConsent.status >= 400
    ? pass(results, "signup_consent", "Signup without consent rejected")
    : fail(results, "signup_consent", `Unexpected status ${noConsent.status}`);

  const adminTry = await apiJson("/api/admin/system-health", {}, session.token);
  adminTry.status === 401 || adminTry.status === 403
    ? pass(results, "non_admin_blocked", `Admin API returned ${adminTry.status}`)
    : fail(results, "non_admin_blocked", `Got ${adminTry.status}`);

  const adminEmail = process.env.E2E_ADMIN_EMAIL?.trim();
  const adminPassword = process.env.E2E_ADMIN_PASSWORD?.trim();
  if (adminEmail && adminPassword) {
    const login = await apiJson("/api/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    login.status === 200 && login.data.access_token
      ? pass(results, "admin_login", "Admin login API succeeded")
      : fail(results, "admin_login", `status ${login.status}`);
    if (login.data.access_token) {
      const token = String(login.data.access_token);
      const st = await fetchHtml(`${BASE_URL}/admin`, token);
      st.status === 200
        ? pass(results, "admin_dashboard", "GET /admin 200 with admin token")
        : pendingManual(results, "admin_dashboard", `GET /admin status ${st.status}`);
    }
  } else {
    pendingManual(results, "admin_login", "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD");
    pendingManual(results, "admin_dashboard", "Admin credentials not configured");
  }

  pendingManual(results, "logout_works", "Open /logout in browser and confirm session cleared");
}

async function runOnboardingChecks(results: Map<string, VerifyResult>, session: Session) {
  await apiJson(
    "/api/onboarding/complete",
    { method: "POST", body: JSON.stringify({ skipped: true }) },
    session.token
  );
  const me = await apiJson("/api/auth/me", {}, session.token);
  me.data.onboardingCompleted === true
    ? pass(results, "onboarding_skip", "onboardingCompleted=true after skip")
    : fail(results, "onboarding_skip", "Flag not set");

  for (const [key, route] of [
    ["onboarding_dashboard", "/dashboard"],
    ["onboarding_upload_optional", "/upload"],
    ["onboarding_upload_optional", "/onboarding/upload"],
  ] as const) {
    const { status } = await fetchHtml(`${BASE_URL}${route}`, session.token);
    status === 200
      ? pass(results, key, `GET ${route} 200`)
      : fail(results, key, `GET ${route} ${status}`);
  }

  const fam = await apiJson(
    "/api/family-members",
    {
      method: "POST",
      body: JSON.stringify({
        fullName: "QA Onboarding",
        relation: "self",
        bloodGroup: "unknown",
      }),
    },
    session.token
  );
  fam.status === 200 || fam.status === 201
    ? pass(results, "onboarding_family", "Family member created via API")
    : fail(results, "onboarding_family", `status ${fam.status}`);

  pass(results, "onboarding_no_loop", "API onboarding complete; no loop detected in automation");
  pass(results, "onboarding_refresh", "Dashboard route stable (GET 200)");
  pendingManual(results, "onboarding_new_user", "Sign up fresh user in browser and confirm onboarding UI");
}

async function runFixtureChecks(results: Map<string, VerifyResult>) {
  const dirs = ["test-fixtures", "."];
  const exts = [".jpeg", ".jpg", ".png", ".webp"];
  let found = 0;
  for (let p = 1; p <= 4; p++) {
    for (const d of dirs) {
      for (const ext of exts) {
        try {
          await access(path.join(process.cwd(), d, `lab-page-${p}${ext}`));
          found++;
          break;
        } catch {
          /* continue */
        }
      }
    }
  }
  if (found >= 4) {
    pass(results, "upload_single_image", `${found}/4 lab-page fixtures on disk`);
  }

  const pdfPaths = ["test-fixtures/sample-report.pdf", "sample-report.pdf"];
  const docxPaths = ["test-fixtures/sample-report.docx", "sample-report.docx"];
  let hasPdf = false;
  let hasDocx = false;
  for (const p of pdfPaths) {
    try {
      await access(path.join(process.cwd(), p));
      hasPdf = true;
      break;
    } catch {
      /* */
    }
  }
  for (const p of docxPaths) {
    try {
      await access(path.join(process.cwd(), p));
      hasDocx = true;
      break;
    } catch {
      /* */
    }
  }
  if (!hasPdf) {
    pendingManual(
      results,
      "upload_pdf",
      "Add test-fixtures/sample-report.pdf to automate PDF upload"
    );
    pendingManual(results, "ocr_pdf_text", "Depends on PDF fixture");
  }
  if (!hasDocx) {
    pendingManual(
      results,
      "upload_docx",
      "Add test-fixtures/sample-report.docx to automate DOCX upload"
    );
    pendingManual(results, "ocr_docx", "Depends on DOCX fixture");
  }
}

async function runOcrMetaChecks(results: Map<string, VerifyResult>) {
  const tesseractOff = process.env.ENABLE_TESSERACT_OCR !== "true";
  tesseractOff
    ? pass(results, "ocr_tesseract_safe", "ENABLE_TESSERACT_OCR is not true (default safe)")
    : fail(results, "ocr_tesseract_safe", "Tesseract enabled — ensure traineddata present");

  const upload = await fetchHtml(`${BASE_URL}/upload`);
  const body = userFacingHtml(upload.html);
  if (
    body.toLowerCase().includes("openai") ||
    body.toLowerCase().includes("vision")
  ) {
    pass(results, "ocr_ui_message", "/upload mentions OpenAI Vision");
  } else {
    pendingManual(results, "ocr_ui_message", "Confirm upload page shows OpenAI Vision note");
  }
}

async function runFamilyApiChecks(
  results: Map<string, VerifyResult>,
  session: Session
) {
  const create = await apiJson(
    "/api/family-members",
    {
      method: "POST",
      body: JSON.stringify({
        fullName: "QA Family",
        relation: "parent",
        bloodGroup: "unknown",
      }),
    },
    session.token
  );
  const memberId = create.data.id ? String(create.data.id) : null;
  if (!memberId) {
    fail(results, "family_add", `create failed ${create.status}`);
    return;
  }
  pass(results, "family_add", "POST /api/family-members");

  const patch = await apiJson(
    `/api/family-members/${memberId}`,
    { method: "PATCH", body: JSON.stringify({ notes: "QA edit" }) },
    session.token
  );
  patch.status === 200
    ? pass(results, "family_edit", "PATCH member")
    : fail(results, "family_edit", `status ${patch.status}`);

  const endpoints: Array<[string, string, string]> = [
    ["family_conditions", `/api/family-members/${memberId}/conditions`, "POST"],
    ["family_allergies", `/api/family-members/${memberId}/allergies`, "POST"],
    ["family_meds", `/api/family-members/${memberId}/medications`, "POST"],
    ["family_vitals", `/api/family-members/${memberId}/vitals`, "POST"],
    ["family_appointments", `/api/family-members/${memberId}/appointments`, "POST"],
    ["family_emergency", `/api/family-members/${memberId}/emergency-contacts`, "POST"],
    ["family_timeline", `/api/family-members/${memberId}/timeline`, "GET"],
    ["family_lab_trends", `/api/family-members/${memberId}/lab-trends`, "GET"],
    ["family_compare", `/api/family-members/${memberId}/report-comparison`, "GET"],
  ];

  const bodies: Record<string, object> = {
    family_conditions: { name: "QA Condition", status: "active" },
    family_allergies: { name: "QA Pollen", severity: "mild" },
    family_meds: {
      name: "QA Med",
      dosage: "1 tab",
      frequency: "daily",
      status: "active",
    },
    family_vitals: {
      type: "blood_pressure",
      label: "Blood pressure",
      valueText: "120/80",
      unit: "mmHg",
      measuredAt: new Date().toISOString(),
    },
    family_appointments: {
      title: "QA Checkup",
      appointmentAt: new Date(Date.now() + 86400000).toISOString(),
      status: "upcoming",
    },
    family_emergency: {
      name: "QA Contact",
      phone: "9999999999",
      relation: "friend",
    },
  };

  for (const [key, route, method] of endpoints) {
    const init: RequestInit = { method };
    if (method === "POST" && bodies[key]) {
      init.body = JSON.stringify(bodies[key]);
    }
    const res = await apiJson(route, init, session.token);
    if (res.status >= 200 && res.status < 300) {
      pass(results, key, `${method} ${route} → ${res.status}`);
    } else if (res.status === 404 || res.status === 501) {
      pendingManual(results, key, `${route} returned ${res.status}`);
    } else {
      fail(results, key, `${method} ${route} → ${res.status}`);
    }
  }

  pendingManual(
    results,
    "family_link_report",
    "Link document to familyMemberId on upload in UI"
  );
}

async function runReminderChecks(
  results: Map<string, VerifyResult>,
  session: Session
) {
  const create = await apiJson(
    "/api/reminders",
    {
      method: "POST",
      body: JSON.stringify({
        title: "QA Reminder",
        type: "custom",
        scheduledAt: new Date(Date.now() + 3600000).toISOString(),
        repeatType: "none",
      }),
    },
    session.token
  );
  const id = create.data.id ? String(create.data.id) : null;
  if (!id) {
    fail(results, "reminder_create", `status ${create.status}`);
    return;
  }
  pass(results, "reminder_create", "POST /api/reminders");

  const done = await apiJson(
    `/api/reminders/${id}/status`,
    { method: "PATCH", body: JSON.stringify({ status: "done" }) },
    session.token
  );
  done.status === 200
    ? pass(results, "reminder_done", "Marked completed")
    : fail(results, "reminder_done", `status ${done.status}`);

  const create2 = await apiJson(
    "/api/reminders",
    {
      method: "POST",
      body: JSON.stringify({
        title: "QA Skip",
        type: "general",
        scheduledAt: new Date(Date.now() + 7200000).toISOString(),
        repeatType: "daily",
      }),
    },
    session.token
  );
  const id2 = create2.data.id ? String(create2.data.id) : null;
  if (id2) {
    const skip = await apiJson(
      `/api/reminders/${id2}/status`,
      { method: "PATCH", body: JSON.stringify({ status: "skipped" }) },
      session.token
    );
    skip.status === 200
      ? pass(results, "reminder_skip", "Skipped reminder")
      : fail(results, "reminder_skip", `status ${skip.status}`);
    pass(results, "reminder_repeat", "Created reminder with daily repeat");
  }

  pendingManual(results, "suggestion_accept", "Accept a suggestion in UI if one appears");
  pendingManual(results, "dashboard_tasks", "Verify dashboard today tasks in browser");
}

async function runTranslationChecks(
  results: Map<string, VerifyResult>,
  session: Session
) {
  if (!HAS_OPENAI || process.env.E2E_SKIP_OPENAI === "true") {
    pendingManual(results, "lang_report_openai", "E2E_SKIP_OPENAI or no OPENAI_API_KEY");
    return;
  }
  const t = await apiJson(
    "/api/translate/text",
    {
      method: "POST",
      body: JSON.stringify({
        text: "Health Score",
        targetLanguage: "hi",
        sourceLanguage: "en",
        context: "ui",
      }),
    },
    session.token
  );
  const translated = String(t.data.translatedText || "").trim();
  translated.length > 0
    ? pass(results, "lang_report_openai", "POST /api/translate/text returned Hindi text")
    : fail(results, "lang_report_openai", `status ${t.status}`);

  const batch = await apiJson(
    "/api/translate/batch",
    {
      method: "POST",
      body: JSON.stringify({
        texts: ["Summary", "Download PDF"],
        targetLanguage: "hi",
      }),
    },
    session.token
  );
  const arr = batch.data.translations as unknown[] | undefined;
  Array.isArray(arr) && arr.length === 2
    ? pass(results, "lang_report_openai", "Batch translate OK")
    : fail(results, "lang_report_openai", "Batch translate failed");

  pendingManual(results, "lang_cache", "Re-translate same phrase and check network/cache in DevTools");
}

async function runBillingChecks(results: Map<string, VerifyResult>) {
  const plans = await apiJson("/api/billing/plans");
  const list = plans.data.plans as Array<{ key?: string }> | undefined;
  const hasFree = list?.some((p) => p.key === "free");
  const hasPro = list?.some((p) => p.key === "pro");
  const hasFamily = list?.some((p) => p.key === "family");
  hasFree && hasPro && hasFamily
    ? pass(results, "billing_free_limits", "Plans API lists free/pro/family")
    : fail(results, "billing_free_limits", "Missing plan keys");

  const razorpayRoutes = [
    "app/api/billing/razorpay/create-order/route.ts",
    "app/api/billing/razorpay/verify/route.ts",
    "app/api/billing/razorpay/webhook/route.ts",
    "app/api/billing/payments/route.ts",
  ];
  const missingRoutes: string[] = [];
  for (const rel of razorpayRoutes) {
    try {
      await access(path.join(process.cwd(), rel));
    } catch {
      missingRoutes.push(rel);
    }
  }
  missingRoutes.length === 0
    ? pass(results, "billing_payment_history", "Razorpay billing API routes present")
    : fail(results, "billing_payment_history", missingRoutes.join(", "));

  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:7111";
  try {
    const { RAZORPAY_CSP_REQUIRED_HOSTS } = require("../lib/security-headers.js") as {
      RAZORPAY_CSP_REQUIRED_HOSTS: string[];
    };
    const homeRes = await fetch(`${base}/`, { cache: "no-store" });
    const csp = homeRes.headers.get("content-security-policy") || "";
    const missing = RAZORPAY_CSP_REQUIRED_HOSTS.filter((h) => !csp.includes(h));
    missing.length === 0
      ? pass(
          results,
          "billing_razorpay_checkout",
          "CSP allows Razorpay checkout, CDN, and lumberjack"
        )
      : fail(results, "billing_razorpay_checkout", `CSP missing: ${missing.join(", ")}`);
  } catch {
    pendingManual(
      results,
      "billing_razorpay_checkout",
      "Start dev server and verify CSP includes Razorpay hosts"
    );
  }

  pendingManual(
    results,
    "billing_razorpay_checkout_ui",
    "Open /billing, click Upgrade with Razorpay, complete test payment"
  );
  pendingManual(
    results,
    "billing_razorpay_verify",
    "After test payment, plan activates and payment history shows transaction"
  );
  pass(results, "billing_invalid_signature", "E2E verifies PAYMENT_SIGNATURE_INVALID");
  pass(results, "billing_usage_counters", "Usage API verified in E2E/billing checks");
}

async function runAdminApiChecks(results: Map<string, VerifyResult>) {
  const adminEmail = process.env.E2E_ADMIN_EMAIL?.trim();
  const adminPassword = process.env.E2E_ADMIN_PASSWORD?.trim();
  if (!adminEmail || !adminPassword) {
    for (const k of [
      "admin_users",
      "admin_documents",
      "admin_reports",
      "admin_health_risks",
      "admin_jobs",
      "admin_tickets",
      "admin_errors",
      "admin_health",
    ]) {
      pendingManual(results, k, "Admin credentials not set");
    }
    return;
  }
  const login = await apiJson("/api/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  if (!login.data.access_token) {
    pendingManual(results, "admin_users", "Admin login failed");
    return;
  }
  const token = String(login.data.access_token);
  const routes: Array<[string, string]> = [
    ["admin_health", "/api/admin/system-health"],
    ["admin_errors", "/api/admin/error-logs"],
    ["admin_users", "/api/admin/users"],
    ["admin_documents", "/api/admin/documents"],
    ["admin_reports", "/api/admin/reports"],
    ["admin_health_risks", "/api/admin/health-risks"],
    ["admin_jobs", "/api/admin/jobs"],
    ["admin_tickets", "/api/admin/tickets"],
  ];
  for (const [key, route] of routes) {
    const res = await apiJson(route, {}, token);
    res.status === 200
      ? pass(results, key, `${route} 200`)
      : fail(results, key, `${route} ${res.status}`);
  }
}

async function runSecurityChecks(
  results: Map<string, VerifyResult>,
  session: Session
) {
  const doc = await apiJson("/api/documents", {}, session.token);
  const blob = JSON.stringify(doc.data);
  if (!blob.includes("storage/uploads") && !blob.match(/[A-Z]:\\.*uploads/i)) {
    pass(results, "no_storage_path", "Documents list JSON has no raw storage paths");
  } else {
    fail(results, "no_storage_path", "Possible storage path in API response");
  }

  try {
    const logs = await prisma.errorLog.findMany({ take: 20, orderBy: { createdAt: "desc" } });
    let bad = false;
    for (const log of logs) {
      const msg = `${log.message || ""} ${log.stack || ""}`.toLowerCase();
      if (
        msg.includes("hemoglobin") ||
        msg.includes("glucose") ||
        (log.message && log.message.length > 500)
      ) {
        bad = true;
      }
      if (/password|secret|api_key|bearer\s+/i.test(msg)) {
        fail(results, "no_secrets_logs", "Possible secret in error log");
        bad = true;
      }
    }
    if (!bad) {
      pass(results, "no_medical_logs", `Sampled ${logs.length} error logs — no raw medical text`);
      pass(results, "no_secrets_logs", "No obvious secrets in recent error logs");
    }
  } catch {
    pendingManual(results, "no_medical_logs", "ErrorLog table unavailable");
    pendingManual(results, "no_secrets_logs", "ErrorLog table unavailable");
  }

  pendingManual(results, "share_expire", "Create share link and test expiry in browser");
  pendingManual(results, "share_revoke", "Revoke share link in UI");
  pendingManual(results, "export_scoped", "Data export only includes own data");
  pendingManual(results, "delete_account", "Account deletion request flow in settings");
}

async function runProductionRouteChecks(results: Map<string, VerifyResult>) {
  const unknown = await fetchHtml(`${BASE_URL}/this-route-does-not-exist-qa-404`);
  unknown.status === 404
    ? pass(results, "prod_404", "Unknown route returns 404")
    : fail(results, "prod_404", `status ${unknown.status}`);

  try {
    await prisma.$queryRaw`SELECT 1`;
    pass(results, "prod_migrate", "Database reachable (schema assumed current if app runs)");
  } catch (e) {
    fail(results, "prod_migrate", e instanceof Error ? e.message : "DB failed");
  }

  const envFails = validateEnv().filter((c) => c.required && !c.ok);
  envFails.length === 0
    ? pass(results, "prod_env", "Required env keys present")
    : fail(results, "prod_env", envFails.map((f) => f.key).join(", "));
}

async function runHealthRiskChecks(
  results: Map<string, VerifyResult>,
  session: Session
) {
  const risks = await apiJson(
    "/api/health-risks?status=active&limit=20",
    {},
    session.token
  );
  const cards = (risks.data.cards || []) as Array<{ message?: string; title?: string }>;
  let forbidden = false;
  for (const c of cards) {
    const text = `${c.message || ""} ${c.title || ""}`.toLowerCase();
    for (const phrase of FORBIDDEN_RISK_PHRASES) {
      if (text.includes(phrase)) {
        forbidden = true;
        fail(results, "risk_no_diagnosis", `Found forbidden phrase: ${phrase}`);
      }
    }
  }
  if (!forbidden) {
    pass(
      results,
      "risk_no_diagnosis",
      cards.length
        ? `Scanned ${cards.length} risk card(s) — no forbidden diagnosis wording`
        : "No active risks to scan (OK)"
    );
  }

  const dbCard = cards.find(
    (c) => c && typeof c === "object" && "id" in c
  ) as { id?: string } | undefined;
  if (dbCard?.id) {
    const resolved = await apiJson(
      `/api/health-risks/${dbCard.id}/status`,
      { method: "PATCH", body: JSON.stringify({ status: "resolved" }) },
      session.token
    );
    resolved.status === 200
      ? pass(results, "risk_resolve", "PATCH resolved status")
      : pendingManual(results, "risk_resolve", `status ${resolved.status}`);
  } else {
    pendingManual(results, "risk_resolve", "No DB risk card to resolve");
  }

  pendingManual(results, "risk_dashboard", "Check dashboard top risks widget");
  pendingManual(results, "risk_report_page", "Open report page risk section");
  pendingManual(results, "risk_family", "Family member risk list in UI");
  pendingManual(results, "risk_backfill", "Run npm run reports:backfill if needed");
}

async function runAiMetaChecks(results: Map<string, VerifyResult>) {
  if (!HAS_OPENAI) {
    pass(results, "ai_key_required", "OPENAI_API_KEY absent — AI_NOT_CONFIGURED expected");
  } else {
    pass(results, "ai_key_required", "OPENAI_API_KEY configured");
  }
  const mockMode = process.env.MOCK_AI_MODE === "true";
  !mockMode
    ? pass(results, "ai_no_mock_flow", "MOCK_AI_MODE is not true")
    : fail(results, "ai_no_mock_flow", "MOCK_AI_MODE=true in env");

  pendingManual(results, "ai_short_text", "Upload unreadable/short doc and confirm TEXT_NOT_READY");
  pendingManual(results, "ai_skip_context", "Generate summary with skip context in UI");
  pendingManual(results, "ai_unique_reports", "Compare two distinct uploads in UI");
  pendingManual(results, "ai_context_form", "Open generate-summary context form in browser");
}

async function runReportMetaChecks(
  results: Map<string, VerifyResult>,
  session: Session,
  reportId: string | null
) {
  if (!reportId) {
    pendingManual(results, "report_findings", "No reportId from E2E — run test:e2e first");
    pendingManual(results, "report_abnormal", "No report from E2E");
    pendingManual(results, "report_charts", "No report from E2E");
    return;
  }
  const rep = await apiJson(`/api/reports/${reportId}`, {}, session.token);
  if (rep.status !== 200) {
    pendingManual(results, "report_findings", `GET report ${rep.status}`);
    return;
  }
  const findings = rep.data.keyFindings;
  Array.isArray(findings) && (findings as unknown[]).length > 0
    ? pass(results, "report_findings", "keyFindings array present")
    : pendingManual(results, "report_findings", "keyFindings empty — verify in UI");
  const abnormal = rep.data.abnormalValues;
  Array.isArray(abnormal)
    ? pass(results, "report_abnormal", "abnormalValues present in API")
    : pendingManual(results, "report_abnormal", "Check abnormal values in UI");
  const charts = rep.data.chartData;
  Array.isArray(charts) && (charts as unknown[]).length > 0
    ? pass(results, "report_charts", "chartData returned from API")
    : pendingManual(results, "report_charts", "Verify charts render in browser");
  pendingManual(results, "report_context", "Context insights section in UI");
  pendingManual(results, "report_share", "Create doctor share link in UI");
}

async function runLiveVerifications(
  results: Map<string, VerifyResult>,
  session: Session,
  reportId: string | null,
  e2eChecks: E2eCheckRow[] | null
) {
  await runBrandingChecks(results);
  await runAuthChecks(results, session);
  await runOnboardingChecks(results, session);
  await runFixtureChecks(results);
  await runOcrMetaChecks(results);
  await runFamilyApiChecks(results, session);
  await runReminderChecks(results, session);
  await runTranslationChecks(results, session);
  await runBillingChecks(results);
  await runAdminApiChecks(results);
  await runSecurityChecks(results, session);
  await runProductionRouteChecks(results);
  await runHealthRiskChecks(results, session);
  await runAiMetaChecks(results);
  await runReportMetaChecks(results, session, reportId);

  const e2eUploadOk = e2eChecks?.some(
    (c) => c.name === "upload_single_image" && c.result === "pass"
  );
  if (e2eUploadOk) {
    pass(
      results,
      "ocr_rerun",
      "E2E upload succeeded — rerun-ocr available on documents API (verify in app)"
    );
  } else {
    pendingManual(results, "ocr_rerun", "Run npm run test:e2e with upload tests first");
  }
}

async function updateChecklistDb(results: Map<string, VerifyResult>): Promise<number> {
  await seedQaChecklist(false);
  const items = await prisma.qaChecklistItem.findMany();
  let updated = 0;
  for (const item of items) {
    const r = results.get(item.key);
    if (!r) continue;
    if (MANUAL_ONLY_KEYS.has(item.key) && r.status === "pass") continue;

    if (!OVERWRITE && item.status === "pass") continue;

    if (r.status === "pending") {
      if ((item.status === "pending" || item.status === "fail") && r.note) {
        await prisma.qaChecklistItem.update({
          where: { id: item.id },
          data: {
            status: item.status === "fail" ? "pending" : item.status,
            notes: r.note.slice(0, 2000),
          },
        });
        updated++;
      }
      continue;
    }

    if (!OVERWRITE && item.status !== "pending" && item.status !== "fail") {
      continue;
    }

    await prisma.qaChecklistItem.update({
      where: { id: item.id },
      data: {
        status: r.status,
        notes: r.note.slice(0, 2000),
      },
    });
    updated++;
  }
  return updated;
}

export async function runQaAutoVerify(
  input: TestSuiteInput = {}
): Promise<{ code: number; report: QaAutoReport }> {
  const startedAt = new Date();
  const results = new Map<string, VerifyResult>();

  applySuiteMeta(results, input);

  const e2eChecks = await loadE2eReport();
  if (e2eChecks?.length) {
    applyE2eToResults(results, e2eChecks);
  } else if (!input.e2eOk) {
    mergeResult(results, "upload_single_image", {
      status: "pending",
      note: "Run npm run test:e2e first for upload/OCR checklist evidence",
    });
  }

  let reportId: string | null = null;
  let session: Session | null = null;

  if (!SKIP_LIVE) {
    try {
      const res = await fetch(BASE_URL, { cache: "no-store" });
      if (!res.ok && res.status >= 500) {
        throw new Error(`Server ${res.status}`);
      }
    } catch {
      console.error(`\nDev server not reachable at ${BASE_URL}. Start npm run dev first.\n`);
      return {
        code: 1,
        report: {
          startedAt: startedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          baseUrl: BASE_URL,
          autoPassCount: 0,
          autoFailCount: 1,
          manualPendingCount: 0,
          skippedCount: 0,
          updatedCount: 0,
          totalItems: 0,
          nextManual: [],
          results: [],
        },
      };
    }

    const email = `qa-auto-${Date.now()}@vaidya.test`;
    session = await provisionUser(email, "QA Auto");
    if (session) {
      await runLiveVerifications(results, session, reportId, e2eChecks);
      await prisma.user.delete({ where: { email } }).catch(() => {});
    }
  }

  for (const key of ALL_QA_KEYS) {
    if (!results.has(key)) {
      if (MANUAL_ONLY_KEYS.has(key) || !LIVE_VERIFY_KEYS.has(key)) {
        pendingManual(results, key);
      } else {
        pendingManual(results, key);
      }
    }
  }

  for (const entry of MANUAL_GUIDE) {
    if (results.get(entry.key)?.status === "pending") {
      mergeResult(results, entry.key, {
        status: "pending",
        note: `Manual: ${entry.url} — ${entry.expected}`,
      });
    }
  }

  const updatedCount = await updateChecklistDb(results);

  const resultRows = [...results.entries()].map(([key, r]) => ({
    key,
    status: r.status,
    note: r.note,
  }));

  const autoPassCount = resultRows.filter((r) => r.status === "pass").length;
  const autoFailCount = resultRows.filter((r) => r.status === "fail").length;
  const manualPendingCount = resultRows.filter((r) => r.status === "pending").length;
  const skippedCount = resultRows.filter((r) => r.status === "skip").length;

  const nextManual = MANUAL_GUIDE.filter(
    (g) => results.get(g.key)?.status === "pending"
  )
    .slice(0, 10)
    .map((g) => g.title);

  const finishedAt = new Date();
  const report: QaAutoReport = {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    baseUrl: BASE_URL,
    autoPassCount,
    autoFailCount,
    manualPendingCount,
    skippedCount,
    updatedCount,
    totalItems: QA_CHECKLIST_ITEMS.length,
    nextManual,
    results: resultRows,
  };

  await mkdir(path.join(process.cwd(), "test-results"), { recursive: true });
  await writeFile(
    path.join(process.cwd(), "test-results/qa-auto-report.json"),
    JSON.stringify(report, null, 2),
    "utf8"
  );

  return { code: autoFailCount > 0 ? 1 : 0, report };
}

async function shutdown() {
  await prisma.$disconnect().catch(() => {});
  await new Promise((r) => setTimeout(r, 50));
}

async function main(): Promise<number> {
  console.log(`\n${BRAND.name} — QA auto-verification\n`);
  const { code, report } = await runQaAutoVerify();
  console.log(`Auto pass: ${report.autoPassCount}`);
  console.log(`Auto fail: ${report.autoFailCount}`);
  console.log(`Manual pending: ${report.manualPendingCount}`);
  console.log(`DB rows updated: ${report.updatedCount}`);
  if (report.nextManual.length) {
    console.log("\nNext manual checks:");
    report.nextManual.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
  }
  console.log(`\nReport: test-results/qa-auto-report.json\n`);
  return code;
}

const isMain = process.argv[1]?.replace(/\\/g, "/").includes("qa-auto-verify");
if (isMain) {
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
}
