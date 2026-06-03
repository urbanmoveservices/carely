import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { unauthorized, forbidden, ok, serverError } from "@/lib/api-response";
import { readPipelineStatusFile, resolveIfctPdfPath } from "@/lib/nutrition/pipeline";
import { IFCT_SOURCE_ATTRIBUTION, isIfctDataPublicUse } from "@/lib/nutrition/config";

async function requireAdmin(req: NextRequest) {
  const token = getTokenFromHeader(req.headers.get("authorization"));
  if (!token) return { error: unauthorized() };
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return { error: forbidden("Admin access required") };
  return { payload };
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if ("error" in admin) return admin.error;

    const [foodsCount, nutrientsCount, foodNutrientRows, aliasesCount, rulesCount, pipelineDb] =
      await Promise.all([
        prisma.food.count(),
        prisma.nutrient.count(),
        prisma.foodNutrient.count(),
        prisma.foodAlias.count(),
        prisma.dietRule.count(),
        prisma.ifctPipelineStatus.findUnique({ where: { id: "default" } }),
      ]);

    const pipelineFile = await readPipelineStatusFile();
    const pdfPath = await resolveIfctPdfPath();

    return ok({
      foodsCount,
      nutrientsCount,
      foodNutrientRows,
      aliasesCount,
      rulesCount,
      pipeline: pipelineDb ?? pipelineFile,
      pdfFound: Boolean(pdfPath),
      pdfPath: pdfPath ?? null,
      sourceAttribution: IFCT_SOURCE_ATTRIBUTION,
      ifctDataPublicUse: isIfctDataPublicUse(),
    });
  } catch (err) {
    console.error("Admin nutrition stats error:", err);
    return serverError();
  }
}
