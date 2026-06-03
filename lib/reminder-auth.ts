import prisma from "@/lib/prisma";
import { forbidden, notFound } from "@/lib/api-response";

export async function validateFamilyMemberForUser(
  userId: string,
  familyMemberId: string | null | undefined
) {
  if (!familyMemberId) return true;
  const member = await prisma.familyMember.findUnique({
    where: { id: familyMemberId },
  });
  if (!member) return notFound("Family member not found");
  if (member.userId !== userId) return forbidden();
  return true;
}

export async function getReminderIfOwned(userId: string, reminderId: string) {
  const reminder = await prisma.reminder.findUnique({
    where: { id: reminderId },
    include: { familyMember: { select: { id: true, fullName: true, relation: true } } },
  });
  if (!reminder) return { error: notFound("Reminder not found") as Response };
  if (reminder.userId !== userId) return { error: forbidden() as Response };
  return { reminder };
}
