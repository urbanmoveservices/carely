"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AllergyForm, type AllergyFormData } from "./AllergyForm";
import type { Allergy } from "@/types";
import { Plus, Trash2 } from "lucide-react";

export function AllergyList({ memberId }: { memberId: string }) {
  const [items, setItems] = useState<Allergy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AllergyFormData>({ name: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getAllergies(memberId).then(setItems).finally(() => setLoading(false));
  }, [memberId]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const created = await api.createAllergy(memberId, form);
      setItems((p) => [created, ...p]);
      setShowForm(false);
      setForm({ name: "" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <Button size="sm" onClick={() => setShowForm(!showForm)} className="min-h-[44px]">
        <Plus className="h-4 w-4" /> Add allergy
      </Button>
      {showForm && (
        <AllergyForm
          value={form}
          onChange={setForm}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          loading={saving}
          submitLabel="Add"
        />
      )}
      <ul className="space-y-2">
        {items.map((a) => (
          <li key={a.id} className="flex justify-between rounded-xl border border-gray-100 bg-white p-3">
            <div>
              <p className="font-medium">{a.name}</p>
              {a.severity && <Badge variant="warning">{a.severity}</Badge>}
            </div>
            <button type="button" onClick={() => api.deleteAllergy(memberId, a.id).then(() => setItems((p) => p.filter((x) => x.id !== a.id)))} className="p-2 text-red-500 min-h-[44px]">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      {items.length === 0 && !showForm && <p className="text-sm text-gray-500">No allergies recorded.</p>}
    </div>
  );
}
