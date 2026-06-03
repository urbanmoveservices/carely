"use client";

import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";

export interface AllergyFormData {
  name: string;
  reaction?: string;
  severity?: string;
  notes?: string;
}

export function AllergyForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  loading,
  submitLabel = "Save",
}: {
  value: AllergyFormData;
  onChange: (v: AllergyFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  loading?: boolean;
  submitLabel?: string;
}) {
  return (
    <div className="space-y-3 p-4 rounded-2xl border border-gray-100 bg-gray-50">
      <div>
        <Label>Allergy *</Label>
        <Input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />
      </div>
      <div>
        <Label>Reaction</Label>
        <Input value={value.reaction || ""} onChange={(e) => onChange({ ...value, reaction: e.target.value })} />
      </div>
      <div>
        <Label>Severity</Label>
        <select
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm min-h-[44px]"
          value={value.severity || ""}
          onChange={(e) => onChange({ ...value, severity: e.target.value || undefined })}
        >
          <option value="">—</option>
          <option value="mild">Mild</option>
          <option value="moderate">Moderate</option>
          <option value="severe">Severe</option>
          <option value="critical">Critical</option>
        </select>
      </div>
      <div className="flex gap-2">
        <Button type="button" onClick={onSubmit} disabled={loading} className="flex-1 min-h-[44px]">
          {submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="min-h-[44px]">
          Cancel
        </Button>
      </div>
    </div>
  );
}
