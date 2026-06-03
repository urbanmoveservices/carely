"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ConditionForm, type ConditionFormData } from "./ConditionForm";
import type { HealthCondition } from "@/types";
import { Plus, Trash2 } from "lucide-react";

const empty: ConditionFormData = { name: "", status: "active" };

export function ConditionList({ memberId }: { memberId: string }) {
  const [items, setItems] = useState<HealthCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ConditionFormData>(empty);
  const [saving, setSaving] = useState(false);

  const load = () =>
    api
      .getConditions(memberId)
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, [memberId]);

  const handleCreate = async () => {
    if (form.name.trim().length < 2) {
      setError("Name required");
      return;
    }
    setSaving(true);
    try {
      const created = await api.createCondition(memberId, form);
      setItems((prev) => [created, ...prev]);
      setShowForm(false);
      setForm(empty);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this condition?")) return;
    try {
      await api.deleteCondition(memberId, id);
      setItems((prev) => prev.filter((c) => c.id !== id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}
      <Button size="sm" onClick={() => setShowForm(!showForm)} className="min-h-[44px]">
        <Plus className="h-4 w-4" /> Add condition
      </Button>
      {showForm && (
        <ConditionForm
          value={form}
          onChange={setForm}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          loading={saving}
          submitLabel="Add"
        />
      )}
      {items.length === 0 ? (
        <p className="text-sm text-gray-500 py-4">No conditions recorded.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 bg-white p-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{c.name}</p>
                <Badge variant={c.status === "active" ? "warning" : "default"}>
                  {c.status}
                </Badge>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(c.id)}
                className="p-2 text-red-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
