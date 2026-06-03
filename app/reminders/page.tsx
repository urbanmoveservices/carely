"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { MobileShell } from "@/components/MobileShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert } from "@/components/ui/Alert";
import { ReminderCard } from "@/components/reminders/ReminderCard";
import {
  ReminderFilters,
  type ReminderFilterTab,
} from "@/components/reminders/ReminderFilters";
import { api } from "@/lib/api-client";
import { startOfToday, endOfToday } from "@/lib/reminder-helpers";
import type { Reminder, HealthTodayResponse } from "@/types";
import { Plus, Bell } from "lucide-react";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function RemindersPage() {
  return (
    <ProtectedRoute>
      <RemindersContent />
    </ProtectedRoute>
  );
}

function RemindersContent() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<ReminderFilterTab>("today");
  const [items, setItems] = useState<Reminder[]>([]);
  const [health, setHealth] = useState<HealthTodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set("limit", "50");
    if (tab === "today") {
      p.set("from", startOfToday().toISOString());
      p.set("to", endOfToday().toISOString());
      p.set("status", "pending");
    } else if (tab === "upcoming") {
      p.set("status", "pending");
    } else if (tab === "done") {
      p.set("status", "done");
    } else if (tab === "skipped") {
      p.set("status", "skipped");
    } else {
      p.set("scope", "all");
    }
    return p.toString();
  }, [tab]);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.getReminders(query),
      api.getHealthToday().catch(() => null),
    ])
      .then(([list, h]) => {
        setItems(list.items);
        if (h) setHealth(h);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatus = async (id: string, status: "done" | "skipped") => {
    setBusyId(id);
    try {
      await api.updateReminderStatus(id, status);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this reminder?")) return;
    setBusyId(id);
    try {
      await api.deleteReminder(id);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <MobileShell>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t("reminders.title")}</h1>
            <p className="text-sm text-gray-500">In-app health tasks</p>
          </div>
          <Link href="/reminders/new">
            <Button size="sm" className="min-h-[44px]">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </Link>
        </div>

        {health && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="rounded-xl bg-brand-50 border border-brand-100 p-3">
              <p className="text-xs text-brand-700">Pending today</p>
              <p className="text-2xl font-bold text-brand-900">
                {health.stats.pendingReminders}
              </p>
            </div>
            <div className="rounded-xl bg-green-50 border border-green-100 p-3">
              <p className="text-xs text-green-700">Done today</p>
              <p className="text-2xl font-bold text-green-900">
                {health.stats.completedToday}
              </p>
            </div>
          </div>
        )}

        <ReminderFilters active={tab} onChange={setTab} />

        {error && <Alert variant="error" className="my-4">{error}</Alert>}

        {loading ? (
          <div className="space-y-3 mt-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 mt-4 rounded-2xl border border-dashed border-gray-200">
            <Bell className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 text-sm">No reminders yet</p>
            <Link href="/reminders/new" className="inline-block mt-4">
              <Button>{t("reminders.add")}</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {items.map((r) => (
              <ReminderCard
                key={r.id}
                reminder={r}
                busy={busyId === r.id}
                onDone={(id) => handleStatus(id, "done")}
                onSkip={(id) => handleStatus(id, "skipped")}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </MobileShell>
  );
}
