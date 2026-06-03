import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { serverError } from "@/lib/api-response";

function serializeLab(t: {
  id: string;
  name: string;
  aliases: unknown;
  category: string;
  unit: string | null;
  normalMin: number | null;
  normalMax: number | null;
  normalText: string | null;
  explanation: string;
}) {
  return {
    id: t.id,
    name: t.name,
    aliases: t.aliases,
    category: t.category,
    unit: t.unit,
    normalMin: t.normalMin,
    normalMax: t.normalMax,
    normalText: t.normalText,
    explanation: t.explanation,
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const category = searchParams.get("category");

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
      ];
    }

    const items = await prisma.labTestReference.findMany({
      where,
      orderBy: { name: "asc" },
      take: 100,
    });

    return NextResponse.json({ items: items.map(serializeLab) });
  } catch (err) {
    console.error("Lab tests list error:", err);
    return serverError();
  }
}
