/**
 * Deploy Vaidya GPT to Hostinger VPS: pre-checks → git push → SSH remote build.
 *
 * Setup:
 *   1. Copy .env.deploy.example → .env.deploy
 *   2. On Hostinger VPS: clone repo, create .env, install Node 20+, pm2, PostgreSQL
 *   3. Run: npm run deploy:hostinger -- "your commit message"
 *
 * Env file: .env.deploy (local only, gitignored)
 */
import { spawnSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import path from "path";

const ROOT = process.cwd();

function loadEnvDeploy(): void {
  const file = path.join(ROOT, ".env.deploy");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function flag(name: string): boolean {
  return process.env[name] === "true" || process.env[name] === "1";
}

function run(
  cmd: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}
): void {
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: false,
    cwd: options.cwd ?? ROOT,
    env: { ...process.env, ...options.env },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runCapture(cmd: string, args: string[]): string {
  const result = spawnSync(cmd, args, {
    encoding: "utf8",
    shell: false,
    cwd: ROOT,
  });
  if (result.status !== 0) {
    throw new Error(
      `${cmd} ${args.join(" ")} failed: ${result.stderr?.trim() || "unknown error"}`
    );
  }
  return (result.stdout ?? "").trim();
}

function ensureGit(): void {
  try {
    runCapture("git", ["--version"]);
  } catch {
    console.error("[ERROR] git is not installed or not in PATH.");
    process.exit(1);
  }
}

function gitPush(commitMessage: string | undefined): void {
  const remote = process.env.GIT_REMOTE?.trim() || "origin";
  const branch = process.env.GIT_BRANCH?.trim() || "main";

  const status = runCapture("git", ["status", "--porcelain"]);
  if (status) {
    if (!commitMessage?.trim()) {
      console.error(
        "[ERROR] Uncommitted changes found. Provide a commit message:\n" +
          '  npm run deploy:hostinger -- "Deploy: describe your changes"\n' +
          "  or set DEPLOY_COMMIT_MESSAGE in .env.deploy"
      );
      process.exit(1);
    }

    console.log("\n[git] Staging changes...");
    run("git", ["add", "-A"]);

    const diffCached = runCapture("git", ["diff", "--cached", "--name-only"]);
    if (diffCached) {
      console.log(`[git] Committing: ${commitMessage}`);
      run("git", ["commit", "-m", commitMessage]);
    }
  } else {
    console.log("[git] Working tree clean — nothing to commit.");
  }

  console.log(`[git] Pushing to ${remote}/${branch}...`);
  run("git", ["push", remote, branch]);
  console.log("[git] Push complete.\n");
}

function runPreDeployChecks(): void {
  console.log("\n[check] Running audit:urls...");
  run("npm", ["run", "audit:urls"]);

  console.log("\n[check] Running prod:check...");
  run("npm", ["run", "prod:check"]);
}

function remoteDeploy(): void {
  const host = process.env.HOSTINGER_SSH_HOST?.trim();
  const user = process.env.HOSTINGER_SSH_USER?.trim();
  const deployPath = process.env.HOSTINGER_DEPLOY_PATH?.trim();
  const port = process.env.HOSTINGER_SSH_PORT?.trim() || "22";
  const key = process.env.HOSTINGER_SSH_KEY?.trim();
  const branch = process.env.GIT_BRANCH?.trim() || "main";
  const pm2Name = process.env.PM2_APP_NAME?.trim() || "vaidya-gpt";

  if (!host || !user || !deployPath) {
    console.error(
      "[ERROR] Missing Hostinger SSH config. Copy .env.deploy.example → .env.deploy and set:\n" +
        "  HOSTINGER_SSH_HOST\n" +
        "  HOSTINGER_SSH_USER\n" +
        "  HOSTINGER_DEPLOY_PATH"
    );
    process.exit(1);
  }

  const remoteScript = "bash scripts/hostinger/remote-deploy.sh";
  const remoteEnv = [
    `DEPLOY_PATH=${JSON.stringify(deployPath)}`,
    `GIT_BRANCH=${JSON.stringify(branch)}`,
    `PM2_APP_NAME=${JSON.stringify(pm2Name)}`,
    `NODE_ENV=production`,
    remoteScript,
  ].join(" ");

  const sshArgs = [
    "-p",
    port,
    "-o",
    "BatchMode=yes",
    "-o",
    "StrictHostKeyChecking=accept-new",
  ];
  if (key) {
    sshArgs.push("-i", key);
  }
  sshArgs.push(`${user}@${host}`, remoteEnv);

  console.log(`[ssh] Deploying on ${user}@${host}:${deployPath} ...\n`);
  run("ssh", sshArgs);
  console.log("\n[done] Hostinger deploy finished.");
}

function main(): void {
  loadEnvDeploy();

  const cliMessage = process.argv.slice(2).join(" ").trim();
  const commitMessage =
    cliMessage || process.env.DEPLOY_COMMIT_MESSAGE?.trim() || undefined;

  console.log("\nVaidya GPT — Hostinger deploy\n");

  ensureGit();

  if (flag("DEPLOY_DRY_RUN")) {
    console.log("[dry-run] Would run checks, git push, and SSH deploy.");
    console.log(`  Commit message: ${commitMessage ?? "(none — fail if dirty)"}`);
    console.log(`  SSH host: ${process.env.HOSTINGER_SSH_HOST ?? "(not set)"}`);
    console.log(`  Deploy path: ${process.env.HOSTINGER_DEPLOY_PATH ?? "(not set)"}`);
    return;
  }

  if (!flag("DEPLOY_SKIP_CHECKS")) {
    runPreDeployChecks();
  } else {
    console.log("[skip] Pre-deploy checks skipped.\n");
  }

  if (!flag("DEPLOY_SKIP_GIT")) {
    gitPush(commitMessage);
  } else {
    console.log("[skip] Git push skipped.\n");
  }

  if (!flag("DEPLOY_SKIP_REMOTE")) {
    remoteDeploy();
  } else {
    console.log("[skip] Remote SSH deploy skipped.\n");
  }
}

main();
