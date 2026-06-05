import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/family-auth";

import { getServerBillingUsage } from "@/lib/billing/usage-limits";

import { ok, serverError } from "@/lib/api-response";



/** Server-calculated quota only — ignores client month/year/period hints. */

export async function GET(req: NextRequest) {

  try {

    const auth = await requireAuth(req);

    if ("error" in auth) return auth.error;



    const summary = await getServerBillingUsage(auth.payload.userId);

    const { usageCounterUnavailable: _u, ...payload } = summary;

    return ok(payload);

  } catch (err) {

    console.error("Billing usage error:", err);

    return serverError();

  }

}


