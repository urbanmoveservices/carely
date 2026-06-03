import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";

const ROOT = process.cwd();
export const IFCT_DATA_DIR = path.join(ROOT, "data", "ifct");
export const IFCT_PDF_PATHS = [
  path.join(IFCT_DATA_DIR, "IFCT.pdf"),
  path.join(ROOT, "scripts", "ifct", "IFCT.pdf"),
];

export async function resolveIfctPdfPath(): Promise<string | null> {
  for (const p of IFCT_PDF_PATHS) {
    try {
      await fs.access(p);
      return p;
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function readPipelineStatusFile() {
  const statusPath = path.join(IFCT_DATA_DIR, "pipeline_status.json");
  try {
    const raw = await fs.readFile(statusPath, "utf8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { phase: "idle" };
  }
}

export function runIfctPipelineStep(step: "extract" | "clean" | "validate" | "import" | "all"): Promise<{ code: number; stdout: string; stderr: string }> {
  const script =
    step === "import"
      ? ["tsx", "scripts/ifct/import_ifct_to_db.ts"]
      : step === "all"
        ? null
        : ["python", `scripts/ifct/${step}_ifct.py`];

  return new Promise((resolve) => {
    if (step === "all") {
      const isWin = process.platform === "win32";
      const cmd = isWin ? "npm.cmd" : "npm";
      const child = spawn(cmd, ["run", "ifct:all"], {
        cwd: ROOT,
        shell: isWin,
        env: process.env,
      });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (d) => (stdout += d.toString()));
      child.stderr.on("data", (d) => (stderr += d.toString()));
      child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
      return;
    }

    const child = spawn(script![0], script!.slice(1), {
      cwd: ROOT,
      shell: process.platform === "win32",
      env: process.env,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}
