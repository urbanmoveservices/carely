import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { notFound, serverError } from "@/lib/api-response";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id } = await params;

    const test = await prisma.labTestReference.findUnique({ where: { id } });
    if (!test) return notFound("Lab test not found");

    await auditUserAction(req, auth.payload.userId, auth.payload.email, AUDIT_ACTIONS.LAB_TEST_VIEWED, {
      entityType: "lab_test_reference",
      entityId: id,
    });

    return NextResponse.json({
      id: test.id,
      name: test.name,
      aliases: test.aliases,
      category: test.category,
      unit: test.unit,
      normalMin: test.normalMin,
      normalMax: test.normalMax,
      normalText: test.normalText,
      explanation: test.explanation,
      highMeaning: test.highMeaning,
      lowMeaning: test.lowMeaning,
      disclaimer:
        test.disclaimer ||
        "Reference ranges vary by lab, age, sex, pregnancy status, and medical history. Always follow your lab report and doctor's advice.",
    });
  } catch (err) {
    console.error("Lab test detail error:", err);
    return serverError();
  }
}
