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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id } = await params;

    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return notFound("Document not found");
    if (doc.userId !== auth.payload.userId) return forbidden();

    const values = await prisma.manualLabValue.findMany({
      where: { documentId: id, userId: auth.payload.userId },
      orderBy: { createdAt: "asc" },
    });
    return ok({ values });
  } catch (err) {
    console.error("Lab values GET error:", err);
    return serverError();
  }
}

const createSchema = z.object({
  testName: z.string().min(1).max(120),
  markerKey: z.string().min(1).max(80),
  value: z.number().optional(),
  valueText: z.string().max(80).optional(),
  unit: z.string().max(40).optional(),
  normalMin: z.number().optional(),
  normalMax: z.number().optional(),
  normalText: z.string().max(80).optional(),
  status: z.string().max(20).optional(),
  notes: z.string().max(500).optional(),
  measuredAt: z.string().datetime().optional(),
  familyMemberId: z.string().optional(),
  resync: z.boolean().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id: documentId } = await params;

    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: { report: true },
    });
    if (!doc) return notFound("Document not found");
    if (doc.userId !== auth.payload.userId) return forbidden();

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message || "Invalid input");
    }

    const row = await prisma.manualLabValue.create({
      data: {
        userId: auth.payload.userId,
        documentId,
        reportId: doc.report?.id,
        familyMemberId: parsed.data.familyMemberId || doc.familyMemberId,
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
        measuredAt: parsed.data.measuredAt
          ? new Date(parsed.data.measuredAt)
          : undefined,
      },
    });

    let sync = { synced: false, count: 0 };
    if (parsed.data.resync !== false) {
      sync = await syncManualLabValuesToPipeline({
        userId: auth.payload.userId,
        documentId,
        reportId: doc.report?.id,
        familyMemberId: doc.familyMemberId,
      });
    }

    return ok({ value: row, sync });
  } catch (err) {
    console.error("Lab values POST error:", err);
    return serverError();
  }
}
