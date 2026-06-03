import { processJobBatch } from "../lib/jobs/worker";

async function main() {
  const limit = Number(process.argv[2] || 20);
  const processed = await processJobBatch(limit);
  console.log(`Processed ${processed} job(s)`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
