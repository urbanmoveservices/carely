import type { Prisma } from "@prisma/client";
import prisma from "./prisma";

export async function createAccessLog(params: {
  userId?: string | null;
  actorUserId?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await prisma.accessLog.create({
      data: {
        userId: params.userId ?? null,
        actorUserId: params.actorUserId ?? null,
        action: params.action,
        resourceType: params.resourceType ?? null,
        resourceId: params.resourceId ?? null,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent?.slice(0, 500) ?? null,
        metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    console.error("[access-log] Failed:", err);
  }
}

export function accessFromRequest(request: Request, userId: string) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  const userAgent = request.headers.get("user-agent") || undefined;
  return { userId, actorUserId: userId, ipAddress, userAgent };
}

export const ACCESS_ACTIONS = {
  LOGIN: "login",
  LOGOUT: "logout",
  REPORT_VIEWED: "report_viewed",
  REPORT_SHARED: "report_shared",
  SHARE_LINK_ACCESSED: "share_link_accessed",
  CAREGIVER_INVITE_ACCEPTED: "caregiver_invite_accepted",
  EMERGENCY_CARD_VIEWED: "emergency_card_viewed",
  DATA_EXPORT_REQUESTED: "data_export_requested",
  ACCOUNT_DELETION_REQUESTED: "account_deletion_requested",
  PASSWORD_RESET: "password_reset",
  EMAIL_VERIFIED: "email_verified",
} as const;
