"use client";

import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";

export interface AppointmentFormData {
  title: string;
  doctorName?: string;
  hospitalName?: string;
  appointmentAt: string;
  status: string;
}

export function AppointmentForm(props: {
  value: AppointmentFormData;
  onChange: (v: AppointmentFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  loading?: boolean;
  remindMe?: boolean;
  onRemindMeChange?: (v: boolean) => void;
}) {
  const { value, onChange, onSubmit, onCancel, loading, remindMe, onRemindMeChange } = props;
  return (
    <div className="space-y-3 p-4 rounded-2xl border border-gray-100 bg-gray-50">
      <div><Label>Title *</Label><Input value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} /></div>
      <div><Label>Doctor</Label><Input value={value.doctorName || ""} onChange={(e) => onChange({ ...value, doctorName: e.target.value })} /></div>
      <div><Label>Hospital</Label><Input value={value.hospitalName || ""} onChange={(e) => onChange({ ...value, hospitalName: e.target.value })} /></div>
      <div><Label>Date & time *</Label><Input type="datetime-local" value={value.appointmentAt} onChange={(e) => onChange({ ...value, appointmentAt: e.target.value })} /></div>
      {onRemindMeChange && (
        <label className="flex items-center gap-2 text-sm text-gray-700 min-h-[44px] cursor-pointer">
          <input
            type="checkbox"
            checked={remindMe ?? true}
            onChange={(e) => onRemindMeChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          Remind me before appointment
        </label>
      )}
      <div className="flex gap-2">
        <Button type="button" onClick={onSubmit} disabled={loading} className="flex-1 min-h-[44px]">Add</Button>
        <Button type="button" variant="outline" onClick={onCancel} className="min-h-[44px]">Cancel</Button>
      </div>
    </div>
  );
}
