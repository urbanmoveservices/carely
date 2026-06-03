import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { unauthorized, forbidden, ok, validationError, serverError } from "@/lib/api-response";
import { runIfctPipelineStep } from "@/lib/nutrition/pipeline";

async function requireAdmin(req: NextRequest) {
  const token = getTokenFromHeader(req.headers.get("authorization"));
  if (!token) return { error: unauthorized() };
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return { error: forbidden("Admin access required") };
  return { payload };
}

const schema = z.object({
  step: z.enum(["extract", "clean", "validate", "import", "all"]),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if ("error" in admin) return admin.error;

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error.message);

    await prisma.ifctPipelineStatus.upsert({
      where: { id: "default" },
      create: { id: "default", phase: parsed.data.step, lastRunAt: new Date() },
      update: { phase: parsed.data.step, lastRunAt: new Date(), lastError: null },
    });

    const result = await runIfctPipelineStep(parsed.data.step);

    await prisma.ifctPipelineStatus.update({
      where: { id: "default" },
      data: {
        phase: result.code === 0 ? "idle" : "error",
        lastError: result.code === 0 ? null : result.stderr.slice(0, 2000) || "Pipeline failed",
        foodsCount: await prisma.food.count(),
        nutrientsCount: await prisma.nutrient.count(),
        foodNutrientRows: await prisma.foodNutrient.count(),
        validationOk: result.code === 0 && parsed.data.step === "validate",
        metadata: { stdout: result.stdout.slice(-4000), stderr: result.stderr.slice(-2000) },
      },
    });

    return ok({
      success: result.code === 0,
      step: parsed.data.step,
      exitCode: result.code,
      stdout: result.stdout.slice(-8000),
      stderr: result.stderr.slice(-4000),
    });
  } catch (err) {
    console.error("Admin nutrition run error:", err);
    return serverError();
  }
}
