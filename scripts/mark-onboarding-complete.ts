/**
 * Marks all users with onboardingCompleted=false as complete (local dev helper).
 * Run: npm run onboarding:complete-all
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    where: { onboardingCompleted: false },
    data: { onboardingCompleted: true },
  });

  console.log(
    `\n[CARELY] Marked onboarding complete for ${result.count} user(s).\n`
  );
}

main()
  .catch((e) => {
    console.error("[CARELY] Error:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
