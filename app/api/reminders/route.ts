import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { reminderSchema, parseScheduledAt } from "@/lib/reminder-schemas";
import { serializeReminder, reminderIncludeMember } from "@/lib/reminder-serialize";
import { validateFamilyMemberForUser } from "@/lib/reminder-auth";
import { validationError, serverError } from "@/lib/api-response";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const familyMemberId = searchParams.get("familyMemberId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId: auth.payload.userId };

    if (status) where.status = status;
    if (type) where.type = type;
    if (familyMemberId) where.familyMemberId = familyMemberId;

    const now = new Date();
    const scopeAll = searchParams.get("scope") === "all";
    if (status) {
      where.status = status;
    } else if (!scopeAll) {
      where.status = "pending";
    }

    if (from || to) {
      where.scheduledAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    } else if (!scopeAll && where.status === "pending") {
      where.scheduledAt = { gte: now };
    }

    const [items, total] = await Promise.all([
      prisma.reminder.findMany({
        where,
        orderBy: { scheduledAt: "asc" },
        skip,
        take: limit,
        include: reminderIncludeMember,
      }),
      prisma.reminder.count({ where }),
    ]);

    return NextResponse.json({
      items: items.map(serializeReminder),
      total,
      page,
      limit,
    });
  } catch (err) {
    console.error("Reminders list error:", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const body = await req.json();
    const parsed = reminderSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message || "Invalid input");
    }

    const check = await validateFamilyMemberForUser(
      auth.payload.userId,
      parsed.data.familyMemberId
    );
    if (check !== true) return check;

    const scheduledAt = parseScheduledAt(parsed.data.scheduledAt);
    if (!scheduledAt) return validationError("Valid scheduled date/time is required");

    const reminder = await prisma.reminder.create({
      data: {
        userId: auth.payload.userId,
        familyMemberId: parsed.data.familyMemberId || null,
        type: parsed.data.type,
        title: parsed.data.title.trim(),
        description: parsed.data.description ?? null,
        scheduledAt,
        repeatType: parsed.data.repeatType,
        relatedMedicationId: parsed.data.relatedMedicationId ?? null,
        relatedAppointmentId: parsed.data.relatedAppointmentId ?? null,
      },
      include: reminderIncludeMember,
    });

    await auditUserAction(req, auth.payload.userId, auth.payload.email, AUDIT_ACTIONS.REMINDER_CREATED, {
      entityType: "reminder",
      entityId: reminder.id,
      metadata: {
        type: reminder.type,
        status: reminder.status,
        familyMemberId: reminder.familyMemberId,
      },
    });

    return NextResponse.json(serializeReminder(reminder), { status: 201 });
  } catch (err) {
    console.error("Reminder create error:", err);
    return serverError();
  }
}
