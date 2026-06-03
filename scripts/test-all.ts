/**
 * Vaidya GPT — full QA test suite (smoke + prod + e2e + checklist auto-update).
 * Run: npm run dev, then npm run test:all
 */
import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { BRAND } from "../lib/brand";
import { runQaAutoVerify } from "./qa-auto-verify";
import prisma from "../lib/prisma";

const BASE_URL =
  process.env.E2E_BASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  "http://localhost:7111";
const SKIP_E2E = process.env.TEST_ALL_SKIP_E2E === "true";
const SKIP_BUILD = process.env.TEST_ALL_SKIP_BUILD === "true";

type SectionResult = {
  name: string;
  ok: boolean;
  detail?: string;
  warnings?: boolean;
};

type E2eReportFile = {
  checks?: Array<{ name: string; result: string; detail?: string }>;
};

type QaAutoFile = {
  results?: Array<{ key: string; status: string; note: string }>;
};

function collectE2eFailures(report: E2eReportFile | null): string[] {
  if (!report?.checks) return [];
  return report.checks
    .filter((c) => c.result === "fail")
    .map((c) => `e2e:${c.name} — ${c.detail || "failed"}`);
}

function collectQaFailures(report: QaAutoFile | null): string[] {
  if (!report?.results) return [];
  return report.results
    .filter((r) => r.status === "fail")
    .map((r) => `qa:${r.key} — ${r.note}`);
}

async function checkServer(): Promise<boolean> {
  try {
    const res = await fetch(BASE_URL, { cache: "no-store" });
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

function runNpmScript(script: string): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    const isWin = process.platform === "win32";
    const child = spawn(isWin ? "npm.cmd" : "npm", ["run", script], {
      cwd: process.cwd(),
      env: process.env,
      shell: isWin,
    });
    let output = "";
    child.stdout?.on("data", (d) => {
      output += d.toString();
    });
    child.stderr?.on("data", (d) => {
      output += d.toString();
    });
    child.on("close", (code) => {
      resolve({ code: code ?? 1, output });
    });
    child.on("error", () => resolve({ code: 1, output }));
  });
}

async function loadJsonSafe<T>(rel: string): Promise<T | null> {
  try {
    const raw = await readFile(path.join(process.cwd(), rel), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function shutdown() {
  await prisma.$disconnect().catch(() => {});
  await new Promise((r) => setTimeout(r, 50));
}

async function main(): Promise<number> {
  console.log(`\n${BRAND.name} — Full QA Test\n`);

  const sections: SectionResult[] = [];

  if (!(await checkServer())) {
    console.error("Dev server is not running. Start npm run dev first.\n");
    process.exitCode = 1;
    await shutdown();
    return 1;
  }

  console.log("Running smoke test…");
  const smoke = await runNpmScript("test:smoke");
  const smokeOk = smoke.code === 0;
  sections.push({
    name: "Smoke test",
    ok: smokeOk,
    detail: smokeOk ? "PASS" : `exit ${smoke.code}`,
  });

  console.log("Running production check…");
  const prod = await runNpmScript("prod:check");
  const prodOk = prod.code === 0;
  const prodWarnings =
    prodOk && prod.output.toLowerCase().includes("warning");
  sections.push({
    name: "Production check",
    ok: prodOk,
    warnings: prodWarnings,
    detail: prodOk
      ? prodWarnings
        ? "PASS WITH WARNINGS"
        : "PASS"
      : `exit ${prod.code}`,
  });

  let e2eOk: boolean | undefined;
  let e2eReport: E2eReportFile | null = null;
  if (SKIP_E2E) {
    sections.push({
      name: "E2E test",
      ok: true,
      detail: "SKIP (TEST_ALL_SKIP_E2E=true)",
    });
  } else {
    console.log("Running E2E test…");
    const e2eStarted = Date.now();
    const e2e = await runNpmScript("test:e2e");
    e2eOk = e2e.code === 0;
    const loaded = await loadJsonSafe<
      E2eReportFile & { finishedAt?: string }
    >("test-results/e2e-report.json");
    if (
      loaded?.finishedAt &&
      new Date(loaded.finishedAt).getTime() >= e2eStarted - 2000
    ) {
      e2eReport = loaded;
    } else if (!e2eOk) {
      e2eReport = null;
    } else {
      e2eReport = loaded;
    }
    sections.push({
      name: "E2E test",
      ok: e2eOk,
      detail: e2eOk ? "PASS" : `exit ${e2e.code}`,
    });
  }

  let buildOk: boolean | undefined;
  if (SKIP_BUILD) {
    sections.push({
      name: "Build",
      ok: true,
      detail: "SKIP (TEST_ALL_SKIP_BUILD=true)",
    });
  } else {
    console.log("Running production build…");
    const build = await runNpmScript("build");
    buildOk = build.code === 0;
    sections.push({
      name: "Build",
      ok: buildOk,
      detail: buildOk ? "PASS" : `exit ${build.code}`,
    });
  }

  console.log("Running QA auto-verification…");
  const { code: qaCode, report: qaReport } = await runQaAutoVerify({
    smokeOk,
    prodOk,
    prodWarnings,
    e2eOk,
    buildOk,
  });
  sections.push({
    name: "QA auto verification",
    ok: qaCode === 0,
    detail: qaCode === 0 ? "PASS" : `${qaReport.autoFailCount} auto-fail(s)`,
  });
  sections.push({
    name: "Checklist auto-updated",
    ok: qaReport.updatedCount >= 0,
    detail: `${qaReport.updatedCount} row(s) updated`,
  });

  const checklist = await prisma.qaChecklistItem.groupBy({
    by: ["status"],
    _count: { status: true },
  });
  const counts = { pass: 0, fail: 0, pending: 0 };
  for (const row of checklist) {
    const n = row._count.status;
    if (row.status === "pass") counts.pass = n;
    else if (row.status === "fail") counts.fail = n;
    else if (row.status === "pending") counts.pending = n;
  }
  const total = counts.pass + counts.fail + counts.pending;

  const e2eReportFinal =
    e2eReport ?? (await loadJsonSafe<E2eReportFile>("test-results/e2e-report.json"));
  const failedChecks = [
    ...collectE2eFailures(e2eReportFinal),
    ...collectQaFailures(qaReport),
  ];

  const fullReport = {
    startedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    sections,
    checklist: { total, ...counts },
    failedChecks,
    qaAuto: qaReport,
    e2eReport: e2eReportFinal,
  };

  await mkdir(path.join(process.cwd(), "test-results"), { recursive: true });
  await writeFile(
    path.join(process.cwd(), "test-results/full-qa-report.json"),
    JSON.stringify(fullReport, null, 2),
    "utf8"
  );

  const maxName = Math.max(...sections.map((s) => s.name.length), 8);
  console.log(`\n## ${"SECTION".padEnd(maxName)}  RESULT`);
  console.log("-".repeat(maxName + 12));
  for (const s of sections) {
    console.log(`${s.name.padEnd(maxName)}  ${s.detail ?? (s.ok ? "PASS" : "FAIL")}`);
  }

  console.log("\nChecklist:");
  console.log(`  Total: ${total}`);
  console.log(`  Pass: ${counts.pass}`);
  console.log(`  Fail: ${counts.fail}`);
  console.log(`  Manual pending: ${counts.pending}`);

  if (failedChecks.length > 0) {
    console.log("\nFailed checks:");
    failedChecks.forEach((line, i) => console.log(`  ${i + 1}. ${line}`));
  }

  if (qaReport.nextManual.length) {
    console.log("\nNext manual checks:");
    qaReport.nextManual.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
  }

  console.log("\nOpen test-results/full-qa-report.json for details.\n");

  const failed =
    !smokeOk ||
    !prodOk ||
    e2eOk === false ||
    buildOk === false ||
    qaCode !== 0;

  return failed ? 1 : 0;
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
