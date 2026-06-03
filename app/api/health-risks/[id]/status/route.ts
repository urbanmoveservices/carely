import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { ok, notFound, validationError, fail } from "@/lib/api-response";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";
import { hasHealthRiskDelegate, warnMissingDelegate } from "@/lib/prisma-delegate-guards";

const bodySchema = z.object({
  status: z.enum(["active", "resolved", "dismissed"]),
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

  const existing = await prisma.healthRisk.findFirst({
    where: { id, userId: auth.payload.userId },
  });
  if (!existing) return notFound("Health risk not found");

  const updated = await prisma.healthRisk.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  const action =
    parsed.data.status === "dismissed"
      ? AUDIT_ACTIONS.HEALTH_RISK_DISMISSED
      : parsed.data.status === "resolved"
        ? AUDIT_ACTIONS.HEALTH_RISK_RESOLVED
        : AUDIT_ACTIONS.HEALTH_RISKS_VIEWED;

  await auditUserAction(req, auth.payload.userId, auth.payload.email, action, {
    entityType: "health_risk",
    entityId: id,
    metadata: { status: parsed.data.status, reportId: existing.reportId },
  });

  return ok({ id: updated.id, status: updated.status });
}
