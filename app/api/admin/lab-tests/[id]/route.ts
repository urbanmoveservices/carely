import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { unauthorized, forbidden, notFound, serverError, validationError } from "@/lib/api-response";

async function requireAdmin(req: NextRequest) {
  const token = getTokenFromHeader(req.headers.get("authorization"));
  if (!token) return { error: unauthorized() };
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return { error: forbidden("Admin access required") };
  return { payload };
}

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  aliases: z.array(z.string()).optional(),
  category: z.string().optional(),
  unit: z.string().optional().nullable(),
  normalMin: z.number().optional().nullable(),
  normalMax: z.number().optional().nullable(),
  normalText: z.string().optional().nullable(),
  explanation: z.string().optional(),
  highMeaning: z.string().optional().nullable(),
  lowMeaning: z.string().optional().nullable(),
  disclaimer: z.string().optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(req);
    if ("error" in admin) return admin.error;
    const { id } = await params;

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error.issues[0]?.message || "Invalid input");

    const item = await prisma.labTestReference.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json(item);
  } catch (err) {
    console.error("Admin lab test update error:", err);
    return serverError();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(req);
    if ("error" in admin) return admin.error;
    const { id } = await params;

    await prisma.labTestReference.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Admin lab test delete error:", err);
    return serverError();
  }
}
