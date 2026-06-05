import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import {
  familyMemberSchema,
  parseDateField,
  formatFamilyMemberValidationError,
  isValidDateOfBirthString,
} from "@/lib/family-schemas";
import {
  serializeFamilyMember,
  familyMemberIncludeCounts,
} from "@/lib/family-serialize";
import { validationError, serverError, fail } from "@/lib/api-response";
import { canAddFamilyMember } from "@/lib/plans";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

function normalizeMemberInput(data: {
  email?: string | null;
  profilePhotoUrl?: string | null;
}) {
  return {
    email: data.email && data.email !== "" ? data.email : null,
    profilePhotoUrl:
      data.profilePhotoUrl && data.profilePhotoUrl !== ""
        ? data.profilePhotoUrl
        : null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const members = await prisma.familyMember.findMany({
      where: { userId: auth.payload.userId },
      orderBy: { createdAt: "desc" },
      include: {
        ...familyMemberIncludeCounts(),
        appointments: {
          where: { status: "upcoming", appointmentAt: { gte: new Date() } },
          orderBy: { appointmentAt: "asc" },
          take: 1,
        },
        medications: { where: { status: "active" }, select: { id: true } },
        conditions: { where: { status: "active" }, select: { id: true } },
      },
    });

    return NextResponse.json(
      members.map((m) => {
        const base = serializeFamilyMember(m);
        return {
          ...base,
          activeConditionCount: m.conditions.length,
          activeMedicationCount: m.medications.length,
          nextAppointment: m.appointments[0]
            ? {
                id: m.appointments[0].id,
                title: m.appointments[0].title,
                appointmentAt: m.appointments[0].appointmentAt.toISOString(),
              }
            : null,
        };
      })
    );
  } catch (err) {
    console.error("Family members list error:", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const body = await req.json();

    const parsed = familyMemberSchema.safeParse(body);
    if (!parsed.success) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[family-members POST] validation failed", {
          keys: body && typeof body === "object" ? Object.keys(body) : [],
          issues: parsed.error.issues.map((i) => ({
            path: i.path,
            message: i.message,
            code: i.code,
          })),
        });
      }
      return validationError(
        formatFamilyMemberValidationError(parsed.error.issues)
      );
    }

    const dob = parsed.data.dateOfBirth as string | null | undefined;
    if (!isValidDateOfBirthString(dob ?? null)) {
      return validationError(
        "Please enter a valid date of birth or leave it blank."
      );
    }

    const memberCheck = await canAddFamilyMember(auth.payload.userId);
    if (!memberCheck.allowed) {
      return fail(
        memberCheck.message || "Family member limit reached for your plan.",
        403,
        memberCheck.code || "FAMILY_MEMBER_LIMIT_REACHED"
      );
    }

    const extra = normalizeMemberInput(parsed.data);
    const member = await prisma.familyMember.create({
      data: {
        userId: auth.payload.userId,
        fullName: parsed.data.fullName.trim(),
        relation: parsed.data.relation,
        dateOfBirth: parseDateField(
          parsed.data.dateOfBirth as string | null | undefined
        ),
        gender: parsed.data.gender ?? null,
        bloodGroup: parsed.data.bloodGroup ?? "unknown",
        phone: parsed.data.phone ?? null,
        email: extra.email,
        profilePhotoUrl: extra.profilePhotoUrl,
        notes: parsed.data.notes ?? null,
        heightCm: parsed.data.heightCm ?? null,
        weightKg: parsed.data.weightKg ?? null,
      },
      include: familyMemberIncludeCounts(),
    });

    await auditUserAction(
      req,
      auth.payload.userId,
      auth.payload.email,
      AUDIT_ACTIONS.FAMILY_MEMBER_CREATED,
      {
        entityType: "family_member",
        entityId: member.id,
        metadata: { relation: member.relation },
      }
    );

    return NextResponse.json(serializeFamilyMember(member), { status: 201 });
  } catch (err) {
    console.error("Family member create error:", err);
    return serverError();
  }
}
