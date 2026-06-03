import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { forbidden, notFound, serverError, validationError } from "@/lib/api-response";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  symptoms: z.array(z.string()).min(1).optional(),
  severity: z.number().int().min(1).max(10).optional().nullable(),
  mood: z.string().max(100).optional().nullable(),
  temperature: z.number().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  occurredAt: z.string().optional(),
  familyMemberId: z.string().optional().nullable(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id } = await params;

    const entry = await prisma.symptomJournalEntry.findFirst({
      where: { id, userId: auth.payload.userId },
      include: {
        familyMember: { select: { id: true, fullName: true, relation: true } },
      },
    });
    if (!entry) return notFound();

    return NextResponse.json({
      id: entry.id,
      familyMemberId: entry.familyMemberId,
      familyMember: entry.familyMember,
      title: entry.title,
      symptoms: entry.symptoms,
      severity: entry.severity,
      mood: entry.mood,
      temperature: entry.temperature,
      notes: entry.notes,
      occurredAt: entry.occurredAt.toISOString(),
      createdAt: entry.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("Symptom entry get error:", err);
    return serverError();
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id } = await params;

    const existing = await prisma.symptomJournalEntry.findFirst({
      where: { id, userId: auth.payload.userId },
    });
    if (!existing) return notFound();

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error.issues[0]?.message || "Invalid input");

    const entry = await prisma.symptomJournalEntry.update({
      where: { id },
      data: {
        ...(parsed.data.title !== undefined && { title: parsed.data.title }),
        ...(parsed.data.symptoms !== undefined && { symptoms: parsed.data.symptoms }),
        ...(parsed.data.severity !== undefined && { severity: parsed.data.severity }),
        ...(parsed.data.mood !== undefined && { mood: parsed.data.mood }),
        ...(parsed.data.temperature !== undefined && { temperature: parsed.data.temperature }),
        ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
        ...(parsed.data.occurredAt !== undefined && { occurredAt: new Date(parsed.data.occurredAt) }),
        ...(parsed.data.familyMemberId !== undefined && { familyMemberId: parsed.data.familyMemberId }),
      },
      include: {
        familyMember: { select: { id: true, fullName: true, relation: true } },
      },
    });

    await auditUserAction(req, auth.payload.userId, auth.payload.email, AUDIT_ACTIONS.SYMPTOM_ENTRY_UPDATED, {
      entityType: "symptom_journal_entry",
      entityId: id,
    });

    return NextResponse.json(entry);
  } catch (err) {
    console.error("Symptom entry update error:", err);
    return serverError();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id } = await params;

    const existing = await prisma.symptomJournalEntry.findFirst({
      where: { id, userId: auth.payload.userId },
    });
    if (!existing) return notFound();

    await prisma.symptomJournalEntry.delete({ where: { id } });

    await auditUserAction(req, auth.payload.userId, auth.payload.email, AUDIT_ACTIONS.SYMPTOM_ENTRY_DELETED, {
      entityType: "symptom_journal_entry",
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Symptom entry delete error:", err);
    return serverError();
  }
}
