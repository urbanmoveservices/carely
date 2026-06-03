import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/family-auth";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";
import { serverError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => ({}));
    const permission = typeof body.permission === "string" ? body.permission : "unknown";

    await auditUserAction(
      req,
      auth.payload.userId,
      auth.payload.email,
      AUDIT_ACTIONS.NOTIFICATION_PERMISSION_REQUESTED,
      {
        entityType: "notification",
        metadata: { permission },
      }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Notification permission audit error:", err);
    return serverError();
  }
}
