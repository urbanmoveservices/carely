import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/family-auth";
import { getUsageSummarySafe } from "@/lib/plans";
import { ok, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const summary = await getUsageSummarySafe(auth.payload.userId);
    const { usageCounterUnavailable: _u, ...payload } = summary;
    return ok(payload);
  } catch (err) {
    console.error("Billing usage error:", err);
    return serverError();
  }
}
