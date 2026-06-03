"use client";

import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";

export interface EmergencyContactFormData {
  name: string;
  phone: string;
  relation?: string;
  email?: string;
}

export function EmergencyContactForm(props: {
  value: EmergencyContactFormData;
  onChange: (v: EmergencyContactFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  const { value, onChange, onSubmit, onCancel, loading } = props;
  return (
    <div className="space-y-3 p-4 rounded-2xl border border-amber-100 bg-amber-50/50">
      <p className="text-xs text-amber-800">Emergency contacts are sensitive. Keep this device secure.</p>
      <div><Label>Name *</Label><Input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} /></div>
      <div><Label>Phone *</Label><Input type="tel" value={value.phone} onChange={(e) => onChange({ ...value, phone: e.target.value })} /></div>
      <div><Label>Relation</Label><Input value={value.relation || ""} onChange={(e) => onChange({ ...value, relation: e.target.value })} /></div>
      <div className="flex gap-2">
        <Button type="button" onClick={onSubmit} disabled={loading} className="flex-1 min-h-[44px]">Add</Button>
        <Button type="button" variant="outline" onClick={onCancel} className="min-h-[44px]">Cancel</Button>
      </div>
    </div>
  );
}
