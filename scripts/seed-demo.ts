/**
 * Seeds demo@carelymed.ai with sample family health data (no real files).
 * Run: npm run demo:seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getAppUrl } from "../lib/app-url";
import { DEMO_USER_EMAIL } from "../lib/user-serialize";
import { getCurrentMonthKey } from "../lib/plans";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Demo@12345";

async function main() {
  console.log("\n[CARELY] Seeding demo account...\n");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  let user = await prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL },
  });

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: "Demo User",
        passwordHash,
        currentPlan: "family",
        subscriptionStatus: "active",
        onboardingCompleted: true,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        isActive: true,
      },
    });
    console.log("Updated existing demo user.");
  } else {
    user = await prisma.user.create({
      data: {
        name: "Demo User",
        email: DEMO_USER_EMAIL,
        passwordHash,
        currentPlan: "family",
        subscriptionStatus: "active",
        subscriptionStartedAt: new Date(),
        onboardingCompleted: true,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });
    console.log("Created demo user.");
  }

  const monthKey = getCurrentMonthKey();
  await prisma.usageCounter.upsert({
    where: { userId_monthKey: { userId: user.id, monthKey } },
    create: {
      userId: user.id,
      monthKey,
      uploadsUsed: 2,
      aiSummariesUsed: 1,
    },
    update: { uploadsUsed: 2, aiSummariesUsed: 1 },
  });

  await prisma.demoSeedLog.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: { seededAt: new Date() },
  });

  const existingMembers = await prisma.familyMember.count({
    where: { userId: user.id },
  });

  if (existingMembers === 0) {
    const self = await prisma.familyMember.create({
      data: {
        userId: user.id,
        fullName: "Atharv Demo",
        relation: "Self",
        gender: "male",
        bloodGroup: "B+",
      },
    });
    const mother = await prisma.familyMember.create({
      data: {
        userId: user.id,
        fullName: "Sita Demo",
        relation: "Mother",
        gender: "female",
        bloodGroup: "O+",
      },
    });

    await prisma.healthCondition.createMany({
      data: [
        {
          userId: user.id,
          familyMemberId: self.id,
          name: "Prediabetes (demo)",
          status: "active",
        },
        {
          userId: user.id,
          familyMemberId: mother.id,
          name: "Hypertension (demo)",
          status: "active",
        },
      ],
    });

    await prisma.medication.create({
      data: {
        userId: user.id,
        familyMemberId: mother.id,
        name: "Amlodipine 5mg (demo)",
        dosage: "5mg",
        frequency: "Once daily",
        status: "active",
      },
    });

    await prisma.vitalRecord.createMany({
      data: [
        {
          userId: user.id,
          familyMemberId: self.id,
          type: "blood_pressure",
          label: "Blood Pressure",
          valueText: "128/82",
          unit: "mmHg",
        },
        {
          userId: user.id,
          familyMemberId: self.id,
          type: "fasting_glucose",
          label: "Fasting Glucose",
          value: 108,
          unit: "mg/dL",
        },
      ],
    });

    const doc = await prisma.document.create({
      data: {
        userId: user.id,
        familyMemberId: self.id,
        originalFilename: "demo-blood-test-report.pdf",
        fileType: "application/pdf",
        fileSize: 245000,
        uploadStatus: "ai_completed",
        extractedText:
          "DEMO LAB REPORT - Atharv Demo. Hemoglobin 14.2 g/dL. Fasting glucose 108 mg/dL (slightly elevated). LDL 118 mg/dL. This is sample text only.",
      },
    });

    await prisma.report.create({
      data: {
        userId: user.id,
        documentId: doc.id,
        summary:
          "Demo summary: Your sample report shows mildly elevated fasting glucose. Discuss lifestyle changes with your doctor. This is not real medical advice.",
        keyFindings: [
          { label: "Fasting glucose", value: "108 mg/dL", status: "borderline" },
        ],
        abnormalValues: [{ name: "Fasting glucose", value: "108", flag: "high" }],
        foodRecommendations: ["More fiber", "Limit refined sugar (demo)"],
        exerciseRecommendations: ["30 min walk daily (demo)"],
        lifestyleAdvice: ["Stay hydrated", "Regular checkups"],
        riskFlags: [{ level: "low", text: "Borderline glucose (demo)" }],
        chartData: { labels: ["Glucose"], values: [108] },
        healthScore: 72,
        aiModelUsed: "demo-mock",
      },
    });

    await prisma.reminder.create({
      data: {
        userId: user.id,
        familyMemberId: mother.id,
        type: "medication",
        title: "Morning medication (demo)",
        scheduledAt: new Date(Date.now() + 86400000),
        repeatType: "daily",
        status: "pending",
      },
    });

    await prisma.healthInsight.create({
      data: {
        userId: user.id,
        familyMemberId: self.id,
        type: "trend",
        title: "Glucose trend (demo)",
        message: "Sample insight: monitor fasting glucose over time.",
        severity: "info",
      },
    });

    await prisma.symptomJournalEntry.create({
      data: {
        userId: user.id,
        familyMemberId: self.id,
        title: "Mild fatigue (demo)",
        symptoms: ["fatigue", "thirst"],
        severity: 2,
        notes: "Sample symptom entry for demo mode.",
      },
    });

    await prisma.emergencyHealthCard.create({
      data: {
        userId: user.id,
        familyMemberId: mother.id,
        publicToken: "demo-emergency-token-" + user.id.slice(0, 8),
        isEnabled: true,
      },
    });

    console.log("Created demo family, documents, and health data.");
  } else {
    console.log("Demo family data already exists — skipped recreate.");
  }

  console.log(`\n  Demo login:  ${getAppUrl()}`);
  console.log(`  Email:     ${DEMO_USER_EMAIL}`);
  console.log(`  Password:  ${DEMO_PASSWORD}`);
  console.log(`  Or use "Try Demo" on the landing page.\n`);
}

main()
  .catch((e) => {
    console.error("[CARELY] Demo seed failed:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
