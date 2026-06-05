import { PrismaClient } from "@prisma/client";
import { getAppUrl } from "../lib/app-url";
import {
  ensureAdminUserFromEnv,
  getAdminCredentialsFromEnv,
} from "../lib/admin-credentials";

const prisma = new PrismaClient();

async function main() {
  const creds = getAdminCredentialsFromEnv();

  if (!creds) {
    console.error(
      "\n[CARELY] Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before creating admin.\n"
    );
    process.exit(1);
  }

  console.log("\n[CARELY] Syncing admin user from environment...\n");

  await ensureAdminUserFromEnv(creds);

  console.log(`[CARELY] Admin user synced from .env.`);
  console.log(`\n  Admin Login:    ${getAppUrl()}/admin/login`);
  console.log(`  Email:          ${creds.email}`);
  console.log(`  Name:           ${creds.name}`);
  console.log(`  Password:       (from .env ADMIN_PASSWORD)\n`);
}

main()
  .catch((e) => {
    console.error("[CARELY] Error creating admin:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
