import { NextRequest } from "next/server";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api-response";
import { seedQaChecklist } from "@/lib/qa-checklist";

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();
    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return forbidden("Admin access required");
    }

    const body = await req.json().catch(() => ({}));
    const force = Boolean((body as { force?: boolean }).force);

    const total = await seedQaChecklist(force);
    return ok({ seeded: true, total });
  } catch (err) {
    console.error("QA seed error:", err);
    return serverError();
  }
}
