import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/family-auth";
import { ok, notFound, forbidden, serverError } from "@/lib/api-response";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id } = await params;

    const job = await prisma.backgroundJob.findUnique({ where: { id } });
    if (!job) return notFound("Job not found");
    if (job.userId && job.userId !== auth.payload.userId) {
      return forbidden();
    }
    return ok({ job });
  } catch (err) {
    console.error("Job GET error:", err);
    return serverError();
  }
}
