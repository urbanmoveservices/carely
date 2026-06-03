"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { EmergencyContactForm, type EmergencyContactFormData } from "./EmergencyContactForm";
import type { EmergencyContact } from "@/types";
import { Plus, Phone, Trash2 } from "lucide-react";

export function EmergencyContactList({ memberId }: { memberId: string }) {
  const [items, setItems] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<EmergencyContactFormData>({ name: "", phone: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getEmergencyContacts(memberId).then(setItems).finally(() => setLoading(false));
  }, [memberId]);

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <Button size="sm" onClick={() => setShowForm(!showForm)} className="min-h-[44px]">
        <Plus className="h-4 w-4" /> Add contact
      </Button>
      {showForm && (
        <EmergencyContactForm
          value={form}
          onChange={setForm}
          onSubmit={async () => {
            setSaving(true);
            try {
              const c = await api.createEmergencyContact(memberId, form);
              setItems((p) => [c, ...p]);
              setShowForm(false);
              setForm({ name: "", phone: "" });
            } finally {
              setSaving(false);
            }
          }}
          onCancel={() => setShowForm(false)}
          loading={saving}
        />
      )}
      <ul className="space-y-2">
        {items.map((c) => (
          <li key={c.id} className="rounded-xl border border-gray-100 bg-white p-3">
            <div className="flex justify-between">
              <div>
                <p className="font-medium">{c.name}</p>
                {c.relation && <p className="text-xs text-gray-500">{c.relation}</p>}
                <a href={`tel:${c.phone}`} className="text-sm text-brand-700 flex items-center gap-1 mt-1 min-h-[44px]">
                  <Phone className="h-4 w-4" /> {c.phone}
                </a>
              </div>
              <button type="button" onClick={() => api.deleteEmergencyContact(memberId, c.id).then(() => setItems((p) => p.filter((x) => x.id !== c.id)))} className="p-2 text-red-500 min-h-[44px]">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      {items.length === 0 && !showForm && <p className="text-sm text-gray-500">No emergency contacts yet.</p>}
    </div>
  );
}
