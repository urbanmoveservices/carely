import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/family-auth";
import { ok, serverError } from "@/lib/api-response";
import { searchFoodsResponse } from "@/lib/nutrition/search";
import { IFCT_SOURCE_ATTRIBUTION } from "@/lib/nutrition/config";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
    const limit = Math.min(parseInt(new URL(req.url).searchParams.get("limit") ?? "20", 10) || 20, 50);
    const result = await searchFoodsResponse(q, limit);
    return ok({ ...result, sourceAttribution: IFCT_SOURCE_ATTRIBUTION });
  } catch (err) {
    console.error("Nutrition search error:", err);
    return serverError();
  }
}
