"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AppointmentForm, type AppointmentFormData } from "./AppointmentForm";
import type { Appointment } from "@/types";
import { Plus, Trash2 } from "lucide-react";

export function AppointmentList({ memberId }: { memberId: string }) {
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AppointmentFormData>({ title: "", appointmentAt: "", status: "upcoming" });
  const [remindMe, setRemindMe] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getAppointments(memberId).then(setItems).finally(() => setLoading(false));
  }, [memberId]);

  const groups = {
    upcoming: items.filter((a) => a.status === "upcoming"),
    completed: items.filter((a) => a.status === "completed"),
    cancelled: items.filter((a) => a.status === "cancelled"),
  };

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <Button size="sm" onClick={() => setShowForm(!showForm)} className="min-h-[44px]">
        <Plus className="h-4 w-4" /> Add appointment
      </Button>
      {showForm && (
        <AppointmentForm
          value={form}
          onChange={setForm}
          remindMe={remindMe}
          onRemindMeChange={setRemindMe}
          onSubmit={async () => {
            setSaving(true);
            try {
              const apptAt = new Date(form.appointmentAt).toISOString();
              const c = await api.createAppointment(memberId, {
                ...form,
                appointmentAt: apptAt,
              });
              if (remindMe) {
                const { appointmentReminderAt } = await import("@/lib/reminder-helpers");
                await api.createReminder({
                  familyMemberId: memberId,
                  type: "appointment",
                  title: `Appointment: ${c.title}`,
                  description: c.doctorName || c.hospitalName || null,
                  scheduledAt: appointmentReminderAt(new Date(apptAt)).toISOString(),
                  repeatType: "none",
                  relatedAppointmentId: c.id,
                });
              }
              setItems((p) => [c, ...p].sort((a, b) => new Date(a.appointmentAt).getTime() - new Date(b.appointmentAt).getTime()));
              setShowForm(false);
              setRemindMe(true);
            } finally {
              setSaving(false);
            }
          }}
          onCancel={() => setShowForm(false)}
          loading={saving}
        />
      )}
      {(["upcoming", "completed", "cancelled"] as const).map((status) =>
        groups[status].length > 0 ? (
          <div key={status}>
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">{status}</h3>
            <ul className="space-y-2">
              {groups[status].map((a) => (
                <li key={a.id} className="flex justify-between rounded-xl border border-gray-100 bg-white p-3">
                  <div>
                    <p className="font-medium">{a.title}</p>
                    <p className="text-xs text-gray-500">{new Date(a.appointmentAt).toLocaleString()}</p>
                    <Badge variant={status === "upcoming" ? "warning" : "default"}>{a.status}</Badge>
                  </div>
                  <button type="button" onClick={() => api.deleteAppointment(memberId, a.id).then(() => setItems((p) => p.filter((x) => x.id !== a.id)))} className="p-2 text-red-500 min-h-[44px]"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          </div>
        ) : null
      )}
    </div>
  );
}
