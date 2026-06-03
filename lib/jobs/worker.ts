import { claimNextJob, completeJob, failJob } from "./queue";
import { runJobHandler } from "./handlers";

export async function processOneJob(): Promise<boolean> {
  const job = await claimNextJob();
  if (!job) return false;

  try {
    const result = await runJobHandler(job.type, job.payload, job.userId);
    await completeJob(job.id, result);
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Job failed";
    await failJob(job.id, msg);
    return true;
  }
}

export async function processJobBatch(limit = 10): Promise<number> {
  let processed = 0;
  for (let i = 0; i < limit; i++) {
    const ran = await processOneJob();
    if (!ran) break;
    processed += 1;
  }
  return processed;
}
