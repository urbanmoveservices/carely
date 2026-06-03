import prisma from "@/lib/prisma";
import { resolveReportForUser } from "@/lib/report-resolve";

export class ChatReportNotFoundError extends Error {
  code = "CHAT_REPORT_NOT_FOUND";
  constructor() {
    super("Report not found");
  }
}

export class ChatFamilyMemberNotFoundError extends Error {
  code = "CHAT_FAMILY_MEMBER_NOT_FOUND";
  constructor() {
    super("Family member not found");
  }
}

export class ChatThreadNotFoundError extends Error {
  code = "CHAT_THREAD_NOT_FOUND";
  constructor() {
    super("Chat thread not found");
  }
}

export async function assertReportOwned(userId: string, reportId: string) {
  const resolved = await resolveReportForUser(userId, reportId);
  if (!resolved) throw new ChatReportNotFoundError();
  return resolved;
}

export async function assertFamilyMemberOwned(
  userId: string,
  familyMemberId: string
) {
  const member = await prisma.familyMember.findFirst({
    where: { id: familyMemberId, userId },
  });
  if (!member) throw new ChatFamilyMemberNotFoundError();
  return member;
}

export async function assertThreadOwned(userId: string, threadId: string) {
  const thread = await prisma.chatThread.findFirst({
    where: { id: threadId, userId },
  });
  if (!thread) throw new ChatThreadNotFoundError();
  return thread;
}
