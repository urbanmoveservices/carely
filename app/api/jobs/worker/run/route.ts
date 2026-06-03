import { NextRequest } from "next/server";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api-response";
import { processJobBatch } from "@/lib/jobs/worker";

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();
    const payload = verifyToken(token);
    if (!payload) return unauthorized("Invalid token");

    const isAdmin = payload.role === "admin";
    const secret = req.headers.get("x-worker-secret");
    const workerSecret = process.env.JOB_WORKER_SECRET;
    if (!isAdmin && secret !== workerSecret) {
      return forbidden("Worker access required");
    }

    const processed = await processJobBatch(10);
    return ok({ processed });
  } catch (err) {
    console.error("Worker run error:", err);
    return serverError();
  }
}
