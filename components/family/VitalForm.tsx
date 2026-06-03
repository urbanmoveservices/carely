"use client";

import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";

const VITAL_TYPES = [
  { value: "blood_pressure", label: "Blood pressure" },
  { value: "sugar", label: "Blood sugar" },
  { value: "weight", label: "Weight" },
  { value: "pulse", label: "Pulse" },
  { value: "temperature", label: "Temperature" },
  { value: "spo2", label: "SpO2" },
  { value: "custom", label: "Custom" },
];

export interface VitalFormData {
  type: string;
  label: string;
  value?: number;
  valueText?: string;
  unit?: string;
  measuredAt?: string;
}

export function VitalForm(props: {
  value: VitalFormData;
  onChange: (v: VitalFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  const { value, onChange, onSubmit, onCancel, loading } = props;
  return (
    <div className="space-y-3 p-4 rounded-2xl border border-gray-100 bg-gray-50">
      <div>
        <Label>Type</Label>
        <select className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm min-h-[44px]" value={value.type} onChange={(e) => onChange({ ...value, type: e.target.value, label: VITAL_TYPES.find((t) => t.value === e.target.value)?.label || value.label })}>
          {VITAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div><Label>Label *</Label><Input value={value.label} onChange={(e) => onChange({ ...value, label: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Value</Label><Input type="number" value={value.value ?? ""} onChange={(e) => onChange({ ...value, value: e.target.value ? parseFloat(e.target.value) : undefined })} /></div>
        <div><Label>Unit</Label><Input value={value.unit || ""} onChange={(e) => onChange({ ...value, unit: e.target.value })} /></div>
      </div>
      <div><Label>Or text value</Label><Input value={value.valueText || ""} onChange={(e) => onChange({ ...value, valueText: e.target.value })} placeholder="e.g. 120/80" /></div>
      <div><Label>Measured at</Label><Input type="datetime-local" value={value.measuredAt || ""} onChange={(e) => onChange({ ...value, measuredAt: e.target.value })} /></div>
      <div className="flex gap-2">
        <Button type="button" onClick={onSubmit} disabled={loading} className="flex-1 min-h-[44px]">Add</Button>
        <Button type="button" variant="outline" onClick={onCancel} className="min-h-[44px]">Cancel</Button>
      </div>
    </div>
  );
}
