import { access, stat } from "fs/promises";
import path from "path";
import prisma from "./prisma";
import { BRAND } from "./brand";
import {
  isEmailConfigured,
  isFileEncryptionConfigured,
  isPushConfigured,
} from "./env";
import { isOpenAiTranslationConfigured } from "./translation/openai-translation-provider";
import { hasHealthRiskDelegate } from "./prisma-delegate-guards";
import { isOpenAiOcrConfigured } from "./ocr/ocr-provider";
import { isTesseractOcrEnabled } from "./ocr/tesseract-ocr";

function getUploadRoot(): string {
  return path.join(
    process.cwd(),
    process.env.LOCAL_UPLOAD_DIR || "storage/uploads"
  );
}

import { getAppUrl } from "./app-url";
import { getSmtpFromDomain } from "./email/config";

function parseAppPort(): number {
  const url = getAppUrl();
  try {
    const u = new URL(url);
    return u.port ? parseInt(u.port, 10) : u.protocol === "https:" ? 443 : 80;
  } catch {
    return 7111;
  }
}

async function safeCount(fn: () => Promise<number>): Promise<number> {
  try {
    return await fn();
  } catch {
    return -1;
  }
}

export async function getSystemHealth() {
  let databaseOk = false;
  let prismaOk = false;
  let storageOk = false;
  let storageBytes = 0;
  let prismaWarning: string | undefined;

  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseOk = true;
    prismaOk = true;
  } catch {
    databaseOk = false;
    prismaOk = false;
  }

  try {
    const root = getUploadRoot();
    await access(root);
    storageOk = true;
    try {
      const s = await stat(root);
      storageBytes = s.size;
    } catch {
      storageOk = true;
    }
  } catch {
    storageOk = false;
  }

  const openAiConfigured = isOpenAiOcrConfigured();
  const tesseractEnabled = isTesseractOcrEnabled();
  const healthRiskPipeline = hasHealthRiskDelegate();

  if (!healthRiskPipeline) {
    prismaWarning =
      "Health risk delegate missing — run npx prisma generate and migrate.";
  }

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    failedDocuments,
    failedSummaries,
    textExtracted,
    aiCompleted,
    totalDocuments,
    totalReports,
    reportsThisMonth,
    queuedJobs,
    runningJobs,
    failedJobs,
    unreadErrors,
    errorsLast24h,
    activeRisks,
    criticalRisks,
    warningRisks,
    failedEmailLogs,
  ] = await Promise.all([
    safeCount(() =>
      prisma.document.count({ where: { uploadStatus: "failed" } })
    ),
    safeCount(() =>
      prisma.document.count({ where: { uploadStatus: "summary_failed" } })
    ),
    safeCount(() =>
      prisma.document.count({
        where: { uploadStatus: { in: ["text_extracted", "ai_completed", "generating_summary"] } },
      })
    ),
    safeCount(() =>
      prisma.document.count({ where: { uploadStatus: "ai_completed" } })
    ),
    safeCount(() => prisma.document.count()),
    safeCount(() => prisma.report.count()),
    safeCount(() =>
      prisma.report.count({ where: { createdAt: { gte: monthStart } } })
    ),
    safeCount(() => prisma.backgroundJob.count({ where: { status: "queued" } })),
    safeCount(() => prisma.backgroundJob.count({ where: { status: "running" } })),
    safeCount(() => prisma.backgroundJob.count({ where: { status: "failed" } })),
    safeCount(() =>
      prisma.errorLog.count({ where: { isResolved: false } })
    ),
    safeCount(() =>
      prisma.errorLog.count({ where: { createdAt: { gte: dayAgo } } })
    ),
    healthRiskPipeline
      ? safeCount(() =>
          prisma.healthRisk.count({ where: { status: "active" } })
        )
      : Promise.resolve(0),
    healthRiskPipeline
      ? safeCount(() =>
          prisma.healthRisk.count({
            where: { status: "active", level: "critical" },
          })
        )
      : Promise.resolve(0),
    healthRiskPipeline
      ? safeCount(() =>
          prisma.healthRisk.count({
            where: { status: "active", level: "warning" },
          })
        )
      : Promise.resolve(0),
    safeCount(() => prisma.emailLog.count({ where: { status: "failed" } })),
  ]);

  return {
    productName: BRAND.name,
    operator: BRAND.operator,
    product: BRAND.name,
    operatorName: BRAND.operator,
    warning: prismaWarning,
    app: { ok: true, port: parseAppPort() },
    database: { ok: databaseOk },
    prisma: { ok: prismaOk },
    openai: {
      configured: openAiConfigured,
      ok: openAiConfigured,
    },
    imageOcr: {
      provider: "openai",
      ok: openAiConfigured,
      configured: openAiConfigured,
    },
    tesseract: {
      enabled: tesseractEnabled,
      ok: !tesseractEnabled || openAiConfigured,
    },
    uploadStorage: { ok: storageOk, bytes: storageBytes },
    storage: { ok: storageOk, bytes: storageBytes },
    fileEncryption: {
      configured: isFileEncryptionConfigured(),
      ok: isFileEncryptionConfigured(),
    },
    encryption: {
      configured: isFileEncryptionConfigured(),
      ok: isFileEncryptionConfigured(),
    },
    translation: {
      provider: "openai",
      configured: isOpenAiTranslationConfigured(),
      ok: isOpenAiTranslationConfigured(),
    },
    email: {
      configured: isEmailConfigured(),
      ok: isEmailConfigured(),
      fromDomain: getSmtpFromDomain(),
      failedLogCount: Math.max(0, failedEmailLogs),
    },
    push: {
      configured: isPushConfigured(),
      ok: isPushConfigured(),
    },
    extraction: { ok: openAiConfigured },
    aiSummary: {
      configured: openAiConfigured,
      ok: openAiConfigured,
    },
    healthRiskPipeline: { ok: healthRiskPipeline },
    postProcessing: { ok: healthRiskPipeline },
    jobs: {
      ok: failedJobs >= 0,
      queued: Math.max(0, queuedJobs),
      running: Math.max(0, runningJobs),
      failed: Math.max(0, failedJobs),
    },
    documents: {
      total: Math.max(0, totalDocuments),
      failed: Math.max(0, failedDocuments),
      textExtracted: Math.max(0, textExtracted),
      aiCompleted: Math.max(0, aiCompleted),
    },
    reports: {
      total: Math.max(0, totalReports),
      generatedThisMonth: Math.max(0, reportsThisMonth),
    },
    risks: {
      active: Math.max(0, activeRisks),
      critical: Math.max(0, criticalRisks),
      warning: Math.max(0, warningRisks),
    },
    errors: {
      unresolved: Math.max(0, unreadErrors),
      last24h: Math.max(0, errorsLast24h),
    },
    counts: {
      failedDocuments: Math.max(0, failedDocuments),
      failedSummaries: Math.max(0, failedSummaries),
      failedTranslations: 0,
      failedJobs: Math.max(0, failedJobs),
      unreadErrors: Math.max(0, unreadErrors),
    },
  };
}
