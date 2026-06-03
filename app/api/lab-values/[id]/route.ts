import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import {
  ok,
  notFound,
  forbidden,
  validationError,
  serverError,
} from "@/lib/api-response";
import { syncManualLabValuesToPipeline } from "@/lib/manual-lab-sync";

const patchSchema = z.object({
  testName: z.string().min(1).max(120).optional(),
  markerKey: z.string().min(1).max(80).optional(),
  value: z.number().nullable().optional(),
  valueText: z.string().max(80).optional(),
  unit: z.string().max(40).optional(),
  normalMin: z.number().nullable().optional(),
  normalMax: z.number().nullable().optional(),
  normalText: z.string().max(80).optional(),
  status: z.string().max(20).optional(),
  notes: z.string().max(500).optional(),
  resync: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id } = await params;

    const existing = await prisma.manualLabValue.findUnique({ where: { id } });
    if (!existing) return notFound("Lab value not found");
    if (existing.userId !== auth.payload.userId) return forbidden();

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message || "Invalid input");
    }

    const row = await prisma.manualLabValue.update({
      where: { id },
      data: {
        testName: parsed.data.testName,
        markerKey: parsed.data.markerKey,
        value: parsed.data.value,
        valueText: parsed.data.valueText,
        unit: parsed.data.unit,
        normalMin: parsed.data.normalMin,
        normalMax: parsed.data.normalMax,
        normalText: parsed.data.normalText,
        status: parsed.data.status,
        notes: parsed.data.notes,
      },
    });

    const sync =
      parsed.data.resync !== false
        ? await syncManualLabValuesToPipeline({
            userId: auth.payload.userId,
            documentId: existing.documentId,
            reportId: existing.reportId,
            familyMemberId: existing.familyMemberId,
          })
        : { synced: false };

    return ok({ value: row, sync });
  } catch (err) {
    console.error("Lab value PATCH error:", err);
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

    const existing = await prisma.manualLabValue.findUnique({ where: { id } });
    if (!existing) return notFound("Lab value not found");
    if (existing.userId !== auth.payload.userId) return forbidden();

    await prisma.manualLabValue.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (err) {
    console.error("Lab value DELETE error:", err);
    return serverError();
  }
}
