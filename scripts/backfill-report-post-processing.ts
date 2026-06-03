import prisma from "../lib/prisma";
import { rerunPostProcessingForReport } from "../lib/rerun-report-post-processing";
import { isPostProcessingSchemaReady } from "../lib/prisma-delegate-guards";

async function main() {
  if (!isPostProcessingSchemaReady()) {
    console.error(
      "Post-processing Prisma delegates are missing. Run Prisma migration and generate first:"
    );
    console.error("  npx prisma generate");
    console.error("  npx prisma migrate dev --name health_risk_post_processing_schema");
    console.error("Then restart the dev server and run: npm run reports:backfill");
    process.exit(1);
  }

  const documents = await prisma.document.findMany({
    where: { uploadStatus: "ai_completed", report: { isNot: null } },
    include: { report: { select: { id: true } } },
    orderBy: { createdAt: "asc" },
  });

  let reportsProcessed = 0;
  let risksCreated = 0;
  let insightsCreated = 0;
  let trendsCreated = 0;
  let suggestionsCreated = 0;
  let notificationsCreated = 0;

  for (const doc of documents) {
    if (!doc.report) continue;
    const existingRisks = await prisma.healthRisk.count({
      where: { reportId: doc.report.id },
    });
    if (existingRisks > 0) {
      continue;
    }

    const result = await rerunPostProcessingForReport(doc.userId, doc.report.id);
    if (!result) continue;

    reportsProcessed += 1;
    risksCreated += result.healthRisksCreated;
    insightsCreated += result.insightsCreated;
    trendsCreated += result.trendRecordsCreated;
    suggestionsCreated += result.reminderSuggestionsCreated;
    notificationsCreated += result.notificationsCreated;
  }

  console.log("Backfill complete:");
  console.log({
    reportsProcessed,
    risksCreated,
    insightsCreated,
    trendsCreated,
    suggestionsCreated,
    notificationsCreated,
  });
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
