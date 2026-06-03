import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireFamilyMember } from "@/lib/family-auth";
import { buildFamilyTimeline } from "@/lib/family-timeline";
import { serverError } from "@/lib/api-response";

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

    const timeline = await buildFamilyTimeline(auth.payload.userId, id);
    return NextResponse.json(timeline);
  } catch (err) {
    console.error("Family timeline error:", err);
    return serverError();
  }
}
