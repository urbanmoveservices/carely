import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { ok, notFound, validationError } from "@/lib/api-response";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

const bodySchema = z.object({
  status: z.enum(["pending", "accepted", "dismissed"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return validationError(parsed.error.issues.map((i) => i.message).join("; "));
  }

  const existing = await prisma.reminderSuggestion.findFirst({
    where: { id, userId: auth.payload.userId },
  });
  if (!existing) return notFound("Suggestion not found");

  const updated = await prisma.reminderSuggestion.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  if (parsed.data.status === "dismissed") {
    await auditUserAction(
      req,
      auth.payload.userId,
      auth.payload.email,
      AUDIT_ACTIONS.REMINDER_SUGGESTION_DISMISSED,
      { entityType: "reminder_suggestion", entityId: id }
    );
  }

  return ok({ id: updated.id, status: updated.status });
}
