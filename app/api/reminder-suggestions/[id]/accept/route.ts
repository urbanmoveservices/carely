import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { ok, notFound } from "@/lib/api-response";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const { id } = await params;

  const suggestion = await prisma.reminderSuggestion.findFirst({
    where: { id, userId: auth.payload.userId },
  });
  if (!suggestion) return notFound("Suggestion not found");

  const scheduledAt =
    suggestion.suggestedDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const reminder = await prisma.reminder.create({
    data: {
      userId: auth.payload.userId,
      familyMemberId: suggestion.familyMemberId,
      type: "custom",
      title: suggestion.title,
      description: suggestion.message,
      scheduledAt,
      repeatType: "none",
      status: "pending",
    },
  });

  await prisma.reminderSuggestion.update({
    where: { id },
    data: { status: "accepted" },
  });

  await auditUserAction(
    req,
    auth.payload.userId,
    auth.payload.email,
    AUDIT_ACTIONS.REMINDER_SUGGESTION_ACCEPTED,
    {
      entityType: "reminder_suggestion",
      entityId: id,
      metadata: { reminderId: reminder.id },
    }
  );

  await auditUserAction(req, auth.payload.userId, auth.payload.email, AUDIT_ACTIONS.REMINDER_CREATED, {
    entityType: "reminder",
    entityId: reminder.id,
    metadata: { fromSuggestion: true },
  });

  return ok({
    suggestionId: id,
    reminder: {
      id: reminder.id,
      title: reminder.title,
      scheduledAt: reminder.scheduledAt.toISOString(),
      status: reminder.status,
    },
  });
}
