"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { MobileShell } from "@/components/MobileShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert } from "@/components/ui/Alert";
import { InsightCard } from "@/components/insights/InsightCard";
import { api } from "@/lib/api-client";
import type { HealthInsight, InsightStats } from "@/types";
import { Lightbulb, Sparkles } from "lucide-react";

export default function InsightsPage() {
  return (
    <ProtectedRoute>
      <InsightsContent />
    </ProtectedRoute>
  );
}

function InsightsContent() {
  const [items, setItems] = useState<HealthInsight[]>([]);
  const [stats, setStats] = useState<InsightStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api
      .getInsights()
      .then((r) => {
        setItems(r.items);
        setStats(r.stats);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    try {
      await api.generateInsights();
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <MobileShell>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Lightbulb className="h-6 w-6 text-brand-600" />
              Health Insights
            </h1>
            <p className="text-xs text-gray-500 mt-1">Rule-based, informational only</p>
          </div>
          <Button
            size="sm"
            className="min-h-[44px]"
            disabled={generating}
            onClick={handleGenerate}
          >
            <Sparkles className="h-4 w-4" />
            {generating ? "…" : "Generate"}
          </Button>
        </div>

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        {stats && (
          <div className="grid grid-cols-4 gap-2 mb-6">
            {[
              { label: "Total", value: stats.total },
              { label: "Unread", value: stats.unread },
              { label: "Warnings", value: stats.warnings },
              { label: "Critical", value: stats.critical },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-gray-100 bg-white p-2 text-center"
              >
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-[10px] text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-gray-200">
            <Lightbulb className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-600 px-4">
              Generate insights to see useful health reminders and trends.
            </p>
            <Button className="mt-4" onClick={handleGenerate} disabled={generating}>
              Generate Insights
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((i) => (
              <InsightCard
                key={i.id}
                insight={i}
                busy={busyId === i.id}
                onRead={async (id) => {
                  setBusyId(id);
                  await api.markInsightRead(id);
                  load();
                  setBusyId(null);
                }}
                onDelete={async (id) => {
                  if (!confirm("Delete this insight?")) return;
                  setBusyId(id);
                  await api.deleteInsight(id);
                  load();
                  setBusyId(null);
                }}
              />
            ))}
          </div>
        )}
      </main>
    </MobileShell>
  );
}
