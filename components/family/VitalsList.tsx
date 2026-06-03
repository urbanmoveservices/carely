"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { VitalForm, type VitalFormData } from "./VitalForm";
import type { VitalRecord, VitalTrendResponse } from "@/types";
import { Plus, Trash2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const TYPE_CHIPS = [
  "all",
  "blood_pressure",
  "sugar",
  "blood_sugar",
  "weight",
  "pulse",
  "temperature",
  "spo2",
];

export function VitalsList({ memberId }: { memberId: string }) {
  const [items, setItems] = useState<VitalRecord[]>([]);
  const [trends, setTrends] = useState<VitalTrendResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<VitalFormData>({
    type: "blood_pressure",
    label: "Blood pressure",
  });
  const [saving, setSaving] = useState(false);

  const load = () => {
    const q = typeFilter === "all" ? "" : `type=${typeFilter}`;
    Promise.all([
      api.getVitals(memberId),
      api.getVitalTrends(memberId, q || undefined),
    ])
      .then(([vitals, t]) => {
        setItems(vitals);
        setTrends(t);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    load();
  }, [memberId, typeFilter]);

  const chartData =
    trends?.items.map((v) => ({
      label: new Date(v.measuredAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      value: v.value as number,
    })) ?? [];

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
        {TYPE_CHIPS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTypeFilter(t)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium min-h-[36px] ${
              typeFilter === t ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            {t === "all" ? "All" : t.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {trends && trends.summary.count > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "Latest", value: trends.summary.latest },
            { label: "Average", value: trends.summary.average },
            { label: "Min", value: trends.summary.min },
            { label: "Max", value: trends.summary.max },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-gray-100 bg-white p-3 text-center"
            >
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-lg font-bold text-gray-900">
                {s.value ?? "—"}
              </p>
            </div>
          ))}
        </div>
      )}

      {chartData.length >= 2 ? (
        <div className="h-44 rounded-xl border border-gray-100 bg-white p-2 w-full overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} width={36} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#0d9488" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-xs text-gray-500 text-center py-4 rounded-xl bg-gray-50">
          Add at least 2 numeric vitals of the same type to see a trend chart.
        </p>
      )}

      <Button size="sm" onClick={() => setShowForm(!showForm)} className="min-h-[44px]">
        <Plus className="h-4 w-4" /> Add vital
      </Button>
      {showForm && (
        <VitalForm
          value={form}
          onChange={setForm}
          onSubmit={async () => {
            setSaving(true);
            try {
              await api.createVital(memberId, form);
              setShowForm(false);
              setLoading(true);
              load();
            } finally {
              setSaving(false);
            }
          }}
          onCancel={() => setShowForm(false)}
          loading={saving}
        />
      )}
      <ul className="space-y-2">
        {items
          .filter((v) => typeFilter === "all" || v.type === typeFilter)
          .map((v) => (
            <li
              key={v.id}
              className="flex justify-between rounded-xl border border-gray-100 bg-white p-3"
            >
              <div>
                <p className="font-medium">{v.label}</p>
                <p className="text-sm text-gray-600">
                  {v.valueText || (v.value != null ? `${v.value} ${v.unit || ""}`.trim() : "—")}
                </p>
                <p className="text-xs text-gray-400">{new Date(v.measuredAt).toLocaleString()}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  api.deleteVital(memberId, v.id).then(() => {
                    setLoading(true);
                    load();
                  })
                }
                className="p-2 text-red-500 min-h-[44px]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
}
