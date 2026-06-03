import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { unauthorized, forbidden, ok, validationError, serverError } from "@/lib/api-response";

function normalizeAlias(alias: string) {
  return alias.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

async function requireAdmin(req: NextRequest) {
  const token = getTokenFromHeader(req.headers.get("authorization"));
  if (!token) return { error: unauthorized() };
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return { error: forbidden("Admin access required") };
  return { payload };
}

const schema = z.object({
  foodId: z.string(),
  alias: z.string().min(1),
  language: z.string().default("en"),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if ("error" in admin) return admin.error;

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error.message);

    const row = await prisma.foodAlias.create({
      data: {
        foodId: parsed.data.foodId,
        alias: parsed.data.alias,
        language: parsed.data.language,
        normalizedAlias: normalizeAlias(parsed.data.alias),
      },
    });
    return ok({ alias: row });
  } catch (err) {
    console.error("Admin nutrition alias error:", err);
    return serverError();
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if ("error" in admin) return admin.error;

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return validationError("id required");

    await prisma.foodAlias.delete({ where: { id } });
    return ok({ success: true });
  } catch (err) {
    console.error("Admin nutrition alias delete error:", err);
    return serverError();
  }
}
