import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireFamilyMember } from "@/lib/family-auth";
import { buildReportComparison } from "@/lib/report-comparison";
import { notFound, serverError } from "@/lib/api-response";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id } = await params;
    const check = await requireFamilyMember(auth.payload.userId, id);
    if ("error" in check) return check.error;

    const data = await buildReportComparison(auth.payload.userId, id);
    if (!data) return notFound();

    await auditUserAction(
      req,
      auth.payload.userId,
      auth.payload.email,
      AUDIT_ACTIONS.REPORT_COMPARISON_VIEWED,
      {
        entityType: "report_comparison",
        entityId: id,
        metadata: { reportCount: data.reports.length },
      }
    );

    return NextResponse.json(data);
  } catch (err) {
    console.error("Report comparison error:", err);
    return serverError();
  }
}
