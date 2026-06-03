import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuth, requireFamilyMember } from "@/lib/family-auth";
import { serverError, validationError } from "@/lib/api-response";
import { generateSecureToken } from "@/lib/secure-token";
import { getBaseUrlFromRequest } from "@/lib/app-url";
import { generateEmergencyCardPdf } from "@/lib/pdf-emergency-card";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

const upsertSchema = z.object({
  isEnabled: z.boolean().optional(),
  includeAllergies: z.boolean().optional(),
  includeMedications: z.boolean().optional(),
  includeConditions: z.boolean().optional(),
  includeEmergencyContacts: z.boolean().optional(),
});

async function loadEmergencyData(userId: string, familyMemberId: string) {
  const member = await prisma.familyMember.findFirst({
    where: { id: familyMemberId, userId },
  });
  if (!member) return null;

  const [allergies, medications, conditions, contacts] = await Promise.all([
    prisma.allergy.findMany({ where: { familyMemberId, userId, }, select: { name: true, severity: true } }),
    prisma.medication.findMany({
      where: { familyMemberId, userId, status: "active" },
      select: { name: true, dosage: true },
    }),
    prisma.healthCondition.findMany({
      where: { familyMemberId, userId, status: "active" },
      select: { name: true, status: true },
    }),
    prisma.emergencyContact.findMany({
      where: { familyMemberId, userId },
      select: { name: true, phone: true, relation: true },
    }),
  ]);

  return { member, allergies, medications, conditions, contacts };
}

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

    const card = await prisma.emergencyHealthCard.findFirst({
      where: { userId: auth.payload.userId, familyMemberId: id },
    });

    if (!card) return NextResponse.json(null);

    const base = getBaseUrlFromRequest(req);
    return NextResponse.json({
      id: card.id,
      familyMemberId: card.familyMemberId,
      publicUrl: `${base}/emergency-card/${card.publicToken}`,
      isEnabled: card.isEnabled,
      includeAllergies: card.includeAllergies,
      includeMedications: card.includeMedications,
      includeConditions: card.includeConditions,
      includeEmergencyContacts: card.includeEmergencyContacts,
      createdAt: card.createdAt.toISOString(),
      updatedAt: card.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error("Emergency card get error:", err);
    return serverError();
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id } = await params;
    const check = await requireFamilyMember(auth.payload.userId, id);
    if ("error" in check) return check.error;

    const body = await req.json().catch(() => ({}));
    const parsed = upsertSchema.safeParse(body);

    const existing = await prisma.emergencyHealthCard.findFirst({
      where: { userId: auth.payload.userId, familyMemberId: id },
    });

    let card;
    if (existing) {
      card = await prisma.emergencyHealthCard.update({
        where: { id: existing.id },
        data: parsed.success ? parsed.data : {},
      });
    } else {
      card = await prisma.emergencyHealthCard.create({
        data: {
          userId: auth.payload.userId,
          familyMemberId: id,
          publicToken: generateSecureToken(24),
          ...(parsed.success ? parsed.data : {}),
        },
      });
      await auditUserAction(req, auth.payload.userId, auth.payload.email, AUDIT_ACTIONS.EMERGENCY_CARD_CREATED, {
        entityType: "emergency_health_card",
        entityId: card.id,
        metadata: { familyMemberId: id },
      });
    }

    const base = getBaseUrlFromRequest(req);
    return NextResponse.json({
      id: card.id,
      publicUrl: `${base}/emergency-card/${card.publicToken}`,
      isEnabled: card.isEnabled,
      includeAllergies: card.includeAllergies,
      includeMedications: card.includeMedications,
      includeConditions: card.includeConditions,
      includeEmergencyContacts: card.includeEmergencyContacts,
    });
  } catch (err) {
    console.error("Emergency card upsert error:", err);
    return serverError();
  }
}
