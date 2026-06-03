import prisma from "@/lib/prisma";
import { QA_CHECKLIST_ITEMS } from "@/lib/qa-checklist-seed";

export { QA_CHECKLIST_GROUPS, QA_CHECKLIST_ITEMS } from "@/lib/qa-checklist-seed";

export async function seedQaChecklist(force = false): Promise<number> {
  const count = await prisma.qaChecklistItem.count();
  if (count > 0 && !force) {
    // Upsert any new keys without wiping statuses
    for (const item of QA_CHECKLIST_ITEMS) {
      await prisma.qaChecklistItem.upsert({
        where: { key: item.key },
        create: {
          group: item.group,
          key: item.key,
          label: item.title,
          description: item.description ?? null,
        },
        update: {
          group: item.group,
          label: item.title,
          description: item.description ?? null,
        },
      });
    }
    return count;
  }

  if (force && count > 0) {
    await prisma.qaChecklistItem.deleteMany({});
  }

  await prisma.qaChecklistItem.createMany({
    data: QA_CHECKLIST_ITEMS.map((item) => ({
      group: item.group,
      key: item.key,
      label: item.title,
      description: item.description ?? null,
      status: "pending",
    })),
    skipDuplicates: true,
  });

  return prisma.qaChecklistItem.count();
}

export async function listQaChecklist() {
  await seedQaChecklist(false);
  return prisma.qaChecklistItem.findMany({
    orderBy: [{ group: "asc" }, { key: "asc" }],
  });
}
