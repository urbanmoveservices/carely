import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireFamilyMember } from "@/lib/family-auth";
import { notFound, serverError } from "@/lib/api-response";
import { generateEmergencyCardPdf } from "@/lib/pdf-emergency-card";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id } = await params;
    const check = await requireFamilyMember(auth.payload.userId, id);
    if ("error" in check) return check.error;

    const member = await prisma.familyMember.findFirst({
      where: { id, userId: auth.payload.userId },
    });
    if (!member) return notFound();

    const card = await prisma.emergencyHealthCard.findFirst({
      where: { userId: auth.payload.userId, familyMemberId: id },
    });

    const [allergies, medications, conditions, contacts] = await Promise.all([
      card?.includeAllergies !== false
        ? prisma.allergy.findMany({ where: { familyMemberId: id, userId: auth.payload.userId } })
        : [],
      card?.includeMedications !== false
        ? prisma.medication.findMany({
            where: { familyMemberId: id, userId: auth.payload.userId, status: "active" },
          })
        : [],
      card?.includeConditions !== false
        ? prisma.healthCondition.findMany({
            where: { familyMemberId: id, userId: auth.payload.userId, status: "active" },
          })
        : [],
      card?.includeEmergencyContacts !== false
        ? prisma.emergencyContact.findMany({ where: { familyMemberId: id, userId: auth.payload.userId } })
        : [],
    ]);

    const pdfBuffer = await generateEmergencyCardPdf({
      fullName: member.fullName,
      relation: member.relation,
      bloodGroup: member.bloodGroup,
      allergies: allergies.map((a) => ({ name: a.name, severity: a.severity })),
      medications: medications.map((m) => ({ name: m.name, dosage: m.dosage })),
      conditions: conditions.map((c) => ({ name: c.name, status: c.status })),
      contacts: contacts.map((c) => ({
        name: c.name,
        phone: c.phone,
        relation: c.relation,
      })),
    });

    await auditUserAction(req, auth.payload.userId, auth.payload.email, AUDIT_ACTIONS.EMERGENCY_CARD_PDF_DOWNLOADED, {
      entityType: "emergency_health_card",
      entityId: card?.id,
      metadata: { familyMemberId: id },
    });

    const filename = `carely-emergency-card-${id}.pdf`;
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Emergency card PDF error:", err);
    return serverError();
  }
}
