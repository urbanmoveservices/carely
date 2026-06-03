import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notFound, serverError } from "@/lib/api-response";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit-log";

const DISCLAIMER =
  "Emergency information for quick reference only. Not medical advice. Contact emergency services (e.g. 112/911) in an emergency.";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const card = await prisma.emergencyHealthCard.findUnique({
      where: { publicToken: token },
      include: {
        familyMember: true,
      },
    });

    if (!card || !card.isEnabled) return notFound("Emergency card not available");
    if (!card.familyMember) return notFound("Emergency card not available");

    const member = card.familyMember;
    const userId = card.userId;
    const memberId = member.id;

    const [allergies, medications, conditions, contacts] = await Promise.all([
      card.includeAllergies
        ? prisma.allergy.findMany({ where: { familyMemberId: memberId, userId } })
        : [],
      card.includeMedications
        ? prisma.medication.findMany({
            where: { familyMemberId: memberId, userId, status: "active" },
          })
        : [],
      card.includeConditions
        ? prisma.healthCondition.findMany({
            where: { familyMemberId: memberId, userId, status: "active" },
          })
        : [],
      card.includeEmergencyContacts
        ? prisma.emergencyContact.findMany({ where: { familyMemberId: memberId, userId } })
        : [],
    ]);

    await createAuditLog({
      action: AUDIT_ACTIONS.EMERGENCY_CARD_VIEWED,
      entityType: "emergency_health_card",
      entityId: card.id,
    });

    return NextResponse.json({
      fullName: member.fullName,
      relation: member.relation,
      bloodGroup: member.bloodGroup,
      allergies: allergies.map((a) => ({
        name: a.name,
        severity: a.severity,
        reaction: a.reaction,
      })),
      medications: medications.map((m) => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
      })),
      conditions: conditions.map((c) => ({
        name: c.name,
        status: c.status,
      })),
      emergencyContacts: contacts.map((c) => ({
        name: c.name,
        phone: c.phone,
        relation: c.relation,
      })),
      disclaimer: DISCLAIMER,
    });
  } catch (err) {
    console.error("Public emergency card error:", err);
    return serverError();
  }
}
