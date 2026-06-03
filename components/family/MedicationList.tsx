"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MedicationForm, type MedicationFormData } from "./MedicationForm";
import type { Medication } from "@/types";
import { Plus, Trash2 } from "lucide-react";

export function MedicationList({ memberId }: { memberId: string }) {
  const [items, setItems] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<MedicationFormData>({ name: "", status: "active" });
  const [createReminder, setCreateReminder] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getMedications(memberId).then(setItems).finally(() => setLoading(false));
  }, [memberId]);

  const active = items.filter((m) => m.status === "active");
  const other = items.filter((m) => m.status !== "active");

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <Button size="sm" onClick={() => setShowForm(!showForm)} className="min-h-[44px]">
        <Plus className="h-4 w-4" /> Add medication
      </Button>
      {showForm && (
        <MedicationForm
          value={form}
          onChange={setForm}
          createReminder={createReminder}
          onCreateReminderChange={setCreateReminder}
          onSubmit={async () => {
          setSaving(true);
          try {
            const c = await api.createMedication(memberId, form);
            if (createReminder) {
              const { defaultMedicationReminderAt } = await import("@/lib/reminder-helpers");
              await api.createReminder({
                familyMemberId: memberId,
                type: "medication",
                title: `Take ${c.name}`,
                description: [c.dosage, c.frequency].filter(Boolean).join(" · ") || null,
                scheduledAt: defaultMedicationReminderAt().toISOString(),
                repeatType: "daily",
                relatedMedicationId: c.id,
              });
            }
            setItems((p) => [c, ...p]);
            setShowForm(false);
            setForm({ name: "", status: "active" });
            setCreateReminder(false);
          } finally { setSaving(false); }
        }}
          onCancel={() => setShowForm(false)}
          loading={saving}
          submitLabel="Add"
        />
      )}
      <MedSection title="Active" items={active} memberId={memberId} onDelete={(id) => setItems((p) => p.filter((x) => x.id !== id))} />
      <MedSection title="Stopped / completed" items={other} memberId={memberId} onDelete={(id) => setItems((p) => p.filter((x) => x.id !== id))} />
    </div>
  );
}

function MedSection({ title, items, memberId, onDelete }: { title: string; items: Medication[]; memberId: string; onDelete: (id: string) => void }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">{title}</h3>
      <ul className="space-y-2">
        {items.map((m) => (
          <li key={m.id} className="rounded-xl border border-gray-100 bg-white p-3 space-y-2">
            <div className="flex justify-between gap-2">
              <div>
                <p className="font-medium">{m.name}</p>
                <p className="text-xs text-gray-500">{[m.dosage, m.frequency].filter(Boolean).join(" · ")}</p>
                {m.refillDate && (
                  <p className="text-xs text-amber-600">Refill: {m.refillDate}</p>
                )}
                {(m.missedDoseCount ?? 0) > 0 && (
                  <p className="text-xs text-red-500">Missed doses: {m.missedDoseCount}</p>
                )}
                <Badge variant={m.status === "active" ? "success" : "default"}>{m.status}</Badge>
              </div>
              <button type="button" onClick={() => api.deleteMedication(memberId, m.id).then(() => onDelete(m.id))} className="p-2 text-red-500 min-h-[44px]"><Trash2 className="h-4 w-4" /></button>
            </div>
            {m.status === "active" && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="min-h-[40px] flex-1"
                  onClick={async () => {
                    const log = await api.createDoseLog(memberId, m.id, {
                      scheduledAt: new Date().toISOString(),
                      status: "pending",
                    });
                    await api.updateDoseLog(memberId, m.id, log.id, { status: "taken" });
                  }}
                >
                  Take dose
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-[40px]"
                  onClick={async () => {
                    const log = await api.createDoseLog(memberId, m.id, {
                      scheduledAt: new Date().toISOString(),
                    });
                    await api.updateDoseLog(memberId, m.id, log.id, { status: "missed" });
                  }}
                >
                  Missed
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-[40px]"
                  onClick={async () => {
                    const log = await api.createDoseLog(memberId, m.id, {
                      scheduledAt: new Date().toISOString(),
                    });
                    await api.updateDoseLog(memberId, m.id, log.id, { status: "skipped" });
                  }}
                >
                  Skip
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
