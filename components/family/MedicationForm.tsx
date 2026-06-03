"use client";

import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";

export interface MedicationFormData {
  name: string;
  dosage?: string;
  frequency?: string;
  status: string;
  startDate?: string;
}

export function MedicationForm(props: {
  value: MedicationFormData;
  onChange: (v: MedicationFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  loading?: boolean;
  submitLabel?: string;
  createReminder?: boolean;
  onCreateReminderChange?: (v: boolean) => void;
}) {
  const {
    value,
    onChange,
    onSubmit,
    onCancel,
    loading,
    submitLabel = "Save",
    createReminder,
    onCreateReminderChange,
  } = props;
  return (
    <div className="space-y-3 p-4 rounded-2xl border border-gray-100 bg-gray-50">
      <div><Label>Name *</Label><Input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} /></div>
      <div><Label>Dosage</Label><Input value={value.dosage || ""} onChange={(e) => onChange({ ...value, dosage: e.target.value })} /></div>
      <div><Label>Frequency</Label><Input value={value.frequency || ""} onChange={(e) => onChange({ ...value, frequency: e.target.value })} /></div>
      <div>
        <Label>Status</Label>
        <select className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm min-h-[44px]" value={value.status} onChange={(e) => onChange({ ...value, status: e.target.value })}>
          <option value="active">Active</option>
          <option value="stopped">Stopped</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      {onCreateReminderChange && (
        <label className="flex items-center gap-2 text-sm text-gray-700 min-h-[44px] cursor-pointer">
          <input
            type="checkbox"
            checked={createReminder ?? false}
            onChange={(e) => onCreateReminderChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          Create medication reminder
        </label>
      )}
      <div className="flex gap-2">
        <Button type="button" onClick={onSubmit} disabled={loading} className="flex-1 min-h-[44px]">{submitLabel}</Button>
        <Button type="button" variant="outline" onClick={onCancel} className="min-h-[44px]">Cancel</Button>
      </div>
    </div>
  );
}
