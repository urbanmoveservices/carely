"use client";

import { RELATIONS, GENDERS, BLOOD_GROUPS } from "@/lib/family-schemas";
import { formatRelation } from "@/lib/family-utils";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import type { FamilyMemberInput } from "@/types";

export interface FamilyMemberFormProps {
  value: FamilyMemberInput;
  onChange: (v: FamilyMemberInput) => void;
  idPrefix?: string;
}

export function FamilyMemberForm({
  value,
  onChange,
  idPrefix = "fm",
}: FamilyMemberFormProps) {
  const set = (patch: Partial<FamilyMemberInput>) =>
    onChange({ ...value, ...patch });

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Basic details</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor={`${idPrefix}-name`}>Full name *</Label>
            <Input
              id={`${idPrefix}-name`}
              value={value.fullName}
              onChange={(e) => set({ fullName: e.target.value })}
              placeholder="e.g. Sita Devi"
              required
            />
          </div>
          <div>
            <Label htmlFor={`${idPrefix}-relation`}>Relation *</Label>
            <select
              id={`${idPrefix}-relation`}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm min-h-[44px]"
              value={value.relation}
              onChange={(e) => set({ relation: e.target.value })}
              required
            >
              <option value="">Select relation</option>
              {RELATIONS.map((r) => (
                <option key={r} value={r}>
                  {formatRelation(r)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor={`${idPrefix}-dob`}>Date of birth</Label>
            <Input
              id={`${idPrefix}-dob`}
              type="date"
              value={value.dateOfBirth || ""}
              onChange={(e) => set({ dateOfBirth: e.target.value || null })}
            />
          </div>
          <div>
            <Label htmlFor={`${idPrefix}-gender`}>Gender</Label>
            <select
              id={`${idPrefix}-gender`}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm min-h-[44px]"
              value={value.gender || ""}
              onChange={(e) => set({ gender: e.target.value || null })}
            >
              <option value="">Not specified</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Health basics</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor={`${idPrefix}-blood`}>Blood group</Label>
            <select
              id={`${idPrefix}-blood`}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm min-h-[44px]"
              value={value.bloodGroup || ""}
              onChange={(e) => set({ bloodGroup: e.target.value || null })}
            >
              <option value="">Unknown</option>
              {BLOOD_GROUPS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`${idPrefix}-height`}>Height (cm)</Label>
              <Input
                id={`${idPrefix}-height`}
                type="number"
                min={0}
                step="0.1"
                value={value.heightCm ?? ""}
                onChange={(e) =>
                  set({
                    heightCm: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor={`${idPrefix}-weight`}>Weight (kg)</Label>
              <Input
                id={`${idPrefix}-weight`}
                type="number"
                min={0}
                step="0.1"
                value={value.weightKg ?? ""}
                onChange={(e) =>
                  set({
                    weightKg: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
              />
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Contact</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor={`${idPrefix}-phone`}>Phone</Label>
            <Input
              id={`${idPrefix}-phone`}
              value={value.phone || ""}
              onChange={(e) => set({ phone: e.target.value || null })}
            />
          </div>
          <div>
            <Label htmlFor={`${idPrefix}-email`}>Email</Label>
            <Input
              id={`${idPrefix}-email`}
              type="email"
              value={value.email || ""}
              onChange={(e) => set({ email: e.target.value || null })}
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Notes</h2>
        <textarea
          id={`${idPrefix}-notes`}
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm min-h-[100px]"
          value={value.notes || ""}
          onChange={(e) => set({ notes: e.target.value || null })}
          placeholder="Medical notes, preferences, consent reminders…"
          maxLength={1000}
        />
        <p className="text-xs text-gray-500 mt-1">
          Family health data is sensitive. Only add members with their consent.
        </p>
      </section>
    </div>
  );
}
