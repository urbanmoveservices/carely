import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { unauthorized, forbidden, serverError, validationError } from "@/lib/api-response";

async function requireAdmin(req: NextRequest) {
  const token = getTokenFromHeader(req.headers.get("authorization"));
  if (!token) return { error: unauthorized() };
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return { error: forbidden("Admin access required") };
  return { payload };
}

const createSchema = z.object({
  name: z.string().min(2),
  aliases: z.array(z.string()).optional(),
  category: z.string().min(1),
  unit: z.string().optional().nullable(),
  normalMin: z.number().optional().nullable(),
  normalMax: z.number().optional().nullable(),
  normalText: z.string().optional().nullable(),
  explanation: z.string().min(10),
  highMeaning: z.string().optional().nullable(),
  lowMeaning: z.string().optional().nullable(),
  disclaimer: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if ("error" in admin) return admin.error;

    const items = await prisma.labTestReference.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ items });
  } catch (err) {
    console.error("Admin lab tests list error:", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if ("error" in admin) return admin.error;

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error.issues[0]?.message || "Invalid input");

    const item = await prisma.labTestReference.create({ data: parsed.data });
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error("Admin lab test create error:", err);
    return serverError();
  }
}
