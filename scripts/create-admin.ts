import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getAppUrl } from "../lib/app-url";

const prisma = new PrismaClient();

async function main() {
  const name = process.env.ADMIN_NAME || "Carely Admin";
  const email = process.env.ADMIN_EMAIL || "admin@carelymed.ai";
  const password = process.env.ADMIN_PASSWORD || "Admin@12345";

  console.log("\n[CARELY] Creating admin user...\n");

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.role === "admin") {
      console.log(`[CARELY] Admin already exists: ${email}`);
    } else {
      await prisma.user.update({
        where: { email },
        data: { role: "admin" },
      });
      console.log(`[CARELY] User ${email} promoted to admin.`);
    }
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: { name, email, passwordHash, role: "admin" },
    });
    console.log(`[CARELY] Admin user created successfully.`);
  }

  console.log(`\n  Admin Login:    ${getAppUrl()}/admin/login`);
  console.log(`  Email:          ${email}`);
  console.log(`  Password:       (from .env ADMIN_PASSWORD)\n`);
}

main()
  .catch((e) => {
    console.error("[CARELY] Error creating admin:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
