import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/family-auth";
import { ok, serverError } from "@/lib/api-response";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const jobs = await prisma.backgroundJob.findMany({
      where: { userId: auth.payload.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return ok({ jobs });
  } catch (err) {
    console.error("Jobs list error:", err);
    return serverError();
  }
}
