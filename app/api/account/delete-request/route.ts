import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { ok, validationError, serverError } from "@/lib/api-response";
import { createAccessLog, accessFromRequest, ACCESS_ACTIONS } from "@/lib/access-log";

const schema = z.object({
  reason: z.string().max(500).optional(),
  confirmText: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message || "Invalid input");
    }
    if (parsed.data.confirmText !== "DELETE MY ACCOUNT") {
      return validationError('Type "DELETE MY ACCOUNT" to confirm');
    }

    const scheduledFor = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const request = await prisma.accountDeletionRequest.create({
      data: {
        userId: auth.payload.userId,
        reason: parsed.data.reason,
        scheduledFor,
        status: "pending",
      },
    });

    await prisma.user.update({
      where: { id: auth.payload.userId },
      data: { isActive: false },
    });

    const meta = accessFromRequest(req, auth.payload.userId);
    await createAccessLog({
      ...meta,
      action: ACCESS_ACTIONS.ACCOUNT_DELETION_REQUESTED,
      resourceType: "account",
      resourceId: auth.payload.userId,
    });

    return ok({ request, message: "Account scheduled for deletion in 7 days (soft-delete active now)." });
  } catch (err) {
    console.error("Delete request error:", err);
    return serverError();
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const requests = await prisma.accountDeletionRequest.findMany({
      where: { userId: auth.payload.userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    return ok({ requests });
  } catch (err) {
    console.error("Delete request GET error:", err);
    return serverError();
  }
}
