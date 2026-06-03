import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/family-auth";
import { generateHealthInsights } from "@/lib/insights-generator";
import { serverError } from "@/lib/api-response";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => ({}));
    const familyMemberId =
      typeof body.familyMemberId === "string" ? body.familyMemberId : undefined;

    const result = await generateHealthInsights(
      auth.payload.userId,
      familyMemberId
    );

    await auditUserAction(
      req,
      auth.payload.userId,
      auth.payload.email,
      AUDIT_ACTIONS.INSIGHTS_GENERATED,
      {
        entityType: "health_insight",
        metadata: { generated: result.generated, familyMemberId },
      }
    );

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("Insights generate error:", err);
    return serverError();
  }
}
