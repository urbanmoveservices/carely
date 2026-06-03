import { z } from "zod";

export const REMINDER_TYPES = ["medication", "appointment", "vital", "custom"] as const;
export const REPEAT_TYPES = ["none", "daily", "weekly", "monthly"] as const;
export const REMINDER_STATUSES = ["pending", "done", "skipped", "cancelled"] as const;

export const reminderSchema = z.object({
  familyMemberId: z.string().optional().nullable(),
  type: z.enum(REMINDER_TYPES),
  title: z.string().min(2).max(200),
  description: z.string().max(1000).optional().nullable(),
  scheduledAt: z.string().min(1),
  repeatType: z.enum(REPEAT_TYPES).default("none"),
  relatedMedicationId: z.string().optional().nullable(),
  relatedAppointmentId: z.string().optional().nullable(),
});

export const reminderPatchSchema = reminderSchema.partial();

export const reminderStatusSchema = z.object({
  status: z.enum(["done", "skipped", "cancelled"]),
});

export function parseScheduledAt(v: string): Date | null {
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
