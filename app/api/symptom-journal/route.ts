import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { serverError, validationError } from "@/lib/api-response";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

const createSchema = z.object({
  familyMemberId: z.string().optional().nullable(),
  title: z.string().min(1).max(200),
  symptoms: z.array(z.string()).min(1),
  severity: z.number().int().min(1).max(10).optional().nullable(),
  mood: z.string().max(100).optional().nullable(),
  temperature: z.number().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  occurredAt: z.string().optional(),
});

function serializeEntry(e: {
  id: string;
  familyMemberId: string | null;
  title: string;
  symptoms: unknown;
  severity: number | null;
  mood: string | null;
  temperature: number | null;
  notes: string | null;
  occurredAt: Date;
  createdAt: Date;
  familyMember?: { id: string; fullName: string; relation: string } | null;
}) {
  return {
    id: e.id,
    familyMemberId: e.familyMemberId,
    familyMember: e.familyMember
      ? { id: e.familyMember.id, fullName: e.familyMember.fullName, relation: e.familyMember.relation }
      : null,
    title: e.title,
    symptoms: e.symptoms,
    severity: e.severity,
    mood: e.mood,
    temperature: e.temperature,
    notes: e.notes,
    occurredAt: e.occurredAt.toISOString(),
    createdAt: e.createdAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(req.url);
    const familyMemberId = searchParams.get("familyMemberId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const severity = searchParams.get("severity");

    const where: Record<string, unknown> = { userId: auth.payload.userId };
    if (familyMemberId) where.familyMemberId = familyMemberId;
    if (severity) where.severity = parseInt(severity, 10);
    if (from || to) {
      where.occurredAt = {};
      if (from) (where.occurredAt as Record<string, Date>).gte = new Date(from);
      if (to) (where.occurredAt as Record<string, Date>).lte = new Date(to);
    }

    const items = await prisma.symptomJournalEntry.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      take: 100,
      include: {
        familyMember: { select: { id: true, fullName: true, relation: true } },
      },
    });

    return NextResponse.json({ items: items.map(serializeEntry) });
  } catch (err) {
    console.error("Symptom journal list error:", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error.issues[0]?.message || "Invalid input");

    if (parsed.data.familyMemberId) {
      const member = await prisma.familyMember.findFirst({
        where: { id: parsed.data.familyMemberId, userId: auth.payload.userId },
      });
      if (!member) return validationError("Family member not found");
    }

    const entry = await prisma.symptomJournalEntry.create({
      data: {
        userId: auth.payload.userId,
        familyMemberId: parsed.data.familyMemberId ?? null,
        title: parsed.data.title,
        symptoms: parsed.data.symptoms,
        severity: parsed.data.severity ?? null,
        mood: parsed.data.mood ?? null,
        temperature: parsed.data.temperature ?? null,
        notes: parsed.data.notes ?? null,
        occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date(),
      },
      include: {
        familyMember: { select: { id: true, fullName: true, relation: true } },
      },
    });

    await auditUserAction(req, auth.payload.userId, auth.payload.email, AUDIT_ACTIONS.SYMPTOM_ENTRY_CREATED, {
      entityType: "symptom_journal_entry",
      entityId: entry.id,
      metadata: { severity: entry.severity },
    });

    return NextResponse.json(serializeEntry(entry), { status: 201 });
  } catch (err) {
    console.error("Symptom journal create error:", err);
    return serverError();
  }
}
