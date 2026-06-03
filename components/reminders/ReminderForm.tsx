"use client";

import { REMINDER_TYPES, REPEAT_TYPES } from "@/lib/reminder-schemas";
import { formatRelation } from "@/lib/family-utils";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import type { ReminderInput, FamilyMember } from "@/types";

interface ReminderFormProps {
  value: ReminderInput;
  onChange: (v: ReminderInput) => void;
  members: FamilyMember[];
  lockFamilyMember?: boolean;
}

export function ReminderForm({
  value,
  onChange,
  members,
  lockFamilyMember,
}: ReminderFormProps) {
  const set = (patch: Partial<ReminderInput>) => onChange({ ...value, ...patch });

  const dtLocal = value.scheduledAt
    ? new Date(value.scheduledAt).toISOString().slice(0, 16)
    : "";

  return (
    <div className="space-y-4">
      <div>
        <Label>Type *</Label>
        <select
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm min-h-[44px]"
          value={value.type}
          onChange={(e) => set({ type: e.target.value as ReminderInput["type"] })}
        >
          {REMINDER_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>Family member (optional)</Label>
        <select
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm min-h-[44px]"
          value={value.familyMemberId || ""}
          disabled={lockFamilyMember}
          onChange={(e) => set({ familyMemberId: e.target.value || null })}
        >
          <option value="">None / general</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {formatRelation(m.relation)} — {m.fullName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>Title *</Label>
        <Input
          value={value.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="e.g. Take evening medication"
        />
      </div>
      <div>
        <Label>Description</Label>
        <textarea
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm min-h-[80px]"
          value={value.description || ""}
          onChange={(e) => set({ description: e.target.value || null })}
          maxLength={1000}
        />
      </div>
      <div>
        <Label>Scheduled date & time *</Label>
        <Input
          type="datetime-local"
          value={dtLocal}
          onChange={(e) =>
            set({
              scheduledAt: e.target.value
                ? new Date(e.target.value).toISOString()
                : "",
            })
          }
        />
      </div>
      <div>
        <Label>Repeat</Label>
        <select
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm min-h-[44px]"
          value={value.repeatType || "none"}
          onChange={(e) =>
            set({ repeatType: e.target.value as ReminderInput["repeatType"] })
          }
        >
          {REPEAT_TYPES.map((r) => (
            <option key={r} value={r}>
              {r === "none" ? "Does not repeat" : r}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
