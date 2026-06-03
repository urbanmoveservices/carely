import prisma from "../lib/prisma";

async function main() {
  const result = await prisma.backgroundJob.updateMany({
    where: { status: "failed" },
    data: {
      status: "queued",
      error: null,
      failedAt: null,
      runAfter: new Date(),
    },
  });
  console.log(`Re-queued ${result.count} failed job(s)`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
