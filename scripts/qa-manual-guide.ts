/**
 * Print grouped manual QA instructions for checklist items still requiring human verification.
 * Run: npm run test:qa:manual-guide
 */
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import prisma from "../lib/prisma";
import { BRAND } from "../lib/brand";
import { QA_CHECKLIST_GROUPS } from "../lib/qa-checklist-seed";
import { MANUAL_GUIDE, manualNoteForKey } from "./qa-checklist-mapper";

const BASE = process.env.E2E_BASE_URL?.trim() || "http://localhost:7111";

async function shutdown() {
  await prisma.$disconnect().catch(() => {});
  await new Promise((r) => setTimeout(r, 50));
}

async function main(): Promise<number> {
  const pending = await prisma.qaChecklistItem.findMany({
    where: { status: "pending" },
    orderBy: [{ group: "asc" }, { key: "asc" }],
  });

  console.log(`\n${BRAND.name} — Manual QA guide\n`);
  console.log(`Base URL: ${BASE}\n`);
  console.log(`Pending checklist items: ${pending.length}\n`);

  const byGroup = new Map<string, typeof pending>();
  for (const item of pending) {
    const list = byGroup.get(item.group) || [];
    list.push(item);
    byGroup.set(item.group, list);
  }

  let step = 1;
  const lines: string[] = [
    `# ${BRAND.name} — Manual QA runbook (generated)`,
    "",
    `Base URL: ${BASE}`,
    "",
    `Review automated results at ${BASE}/admin/qa-checklist`,
    "",
  ];

  for (const g of QA_CHECKLIST_GROUPS) {
    const items = byGroup.get(g.id);
    if (!items?.length) continue;
    console.log(`\n### ${g.label}\n`);
    lines.push(`## ${g.label}`, "");
    for (const item of items) {
      const guide = MANUAL_GUIDE.find((m) => m.key === item.key);
      const url = guide?.url?.replace("{id}", "{reportOrMemberId}") || `/${item.group}`;
      const fullUrl = url.startsWith("http") ? url : `${BASE}${url.startsWith("/") ? url : `/${url}`}`;
      console.log(`${step}. [${item.key}] ${item.label}`);
      console.log(`   Open: ${fullUrl}`);
      if (guide?.steps?.length) {
        guide.steps.forEach((s) => console.log(`   - ${s}`));
      } else if (item.description) {
        console.log(`   - ${item.description}`);
      } else {
        console.log(`   - ${manualNoteForKey(item.key)}`);
      }
      console.log(`   Expected: ${guide?.expected || "Meets acceptance criteria"}`);
      if (item.notes) console.log(`   Note: ${item.notes}`);
      console.log("");
      lines.push(
        `### ${step}. ${item.label} (\`${item.key}\`)`,
        "",
        `1. Open: ${fullUrl}`,
        ...(guide?.steps || [item.description || manualNoteForKey(item.key)]).map(
          (s, i) => `${i + 2}. ${s}`
        ),
        "",
        `**Expected:** ${guide?.expected || "Meets acceptance criteria"}`,
        ""
      );
      step++;
    }
  }

  if (pending.length === 0) {
    console.log("No pending items — checklist fully verified or empty.\n");
  }

  await mkdir(path.join(process.cwd(), "docs"), { recursive: true });
  await writeFile(
    path.join(process.cwd(), "docs/QA-MANUAL-RUNBOOK.md"),
    lines.join("\n"),
    "utf8"
  );
  console.log("Written: docs/QA-MANUAL-RUNBOOK.md\n");
  return 0;
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
