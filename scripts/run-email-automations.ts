import { runEmailAutomations } from "../lib/email/email-automation-runner";
import prisma from "../lib/prisma";

async function main() {
  const result = await runEmailAutomations();
  console.log("[email:run]", result);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
