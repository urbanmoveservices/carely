"use client";

import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";

export interface ConditionFormData {
  name: string;
  status: string;
  diagnosedOn?: string;
  severity?: string;
  notes?: string;
}

interface ConditionFormProps {
  value: ConditionFormData;
  onChange: (v: ConditionFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  loading?: boolean;
  submitLabel?: string;
}

export function ConditionForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  loading,
  submitLabel = "Save",
}: ConditionFormProps) {
  return (
    <div className="space-y-3 p-4 rounded-2xl border border-gray-100 bg-gray-50">
      <div>
        <Label>Condition name *</Label>
        <Input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />
      </div>
      <div>
        <Label>Status</Label>
        <select
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm min-h-[44px]"
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value })}
        >
          <option value="active">Active</option>
          <option value="resolved">Resolved</option>
          <option value="monitoring">Monitoring</option>
        </select>
      </div>
      <div>
        <Label>Severity</Label>
        <select
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm min-h-[44px]"
          value={value.severity || ""}
          onChange={(e) => onChange({ ...value, severity: e.target.value || undefined })}
        >
          <option value="">Unknown</option>
          <option value="mild">Mild</option>
          <option value="moderate">Moderate</option>
          <option value="severe">Severe</option>
        </select>
      </div>
      <div>
        <Label>Diagnosed on</Label>
        <Input type="date" value={value.diagnosedOn || ""} onChange={(e) => onChange({ ...value, diagnosedOn: e.target.value })} />
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
