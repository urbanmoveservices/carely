"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ReminderSuggestionItem } from "@/types";
import { ListChecks } from "lucide-react";
import { subscribeDashboardRefresh } from "@/lib/dashboard-events";

export function DashboardSuggestedFollowups() {
  const [items, setItems] = useState<ReminderSuggestionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .getReminderSuggestions("status=pending&limit=3")
      .then((r) => setItems(r.items.slice(0, 3)))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    return subscribeDashboardRefresh(load);
  }, [load]);

  const accept = async (id: string) => {
    try {
      await api.acceptReminderSuggestion(id);
      load();
    } catch {}
  };

  if (loading) return <Skeleton className="h-20 w-full mb-6 rounded-2xl" />;
  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-brand-600" />
          <h2 className="font-semibold text-gray-900">Suggested Follow-ups</h2>
        </div>
        <Link href="/reminders" className="text-sm text-brand-600 font-medium">
          View all
        </Link>
      </div>
      <ul className="space-y-2">
        {items.map((s) => (
          <li key={s.id} className="rounded-xl bg-gray-50 p-3">
            <p className="font-medium text-sm text-gray-900">{s.title}</p>
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{s.message}</p>
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={() => accept(s.id)}>
                Accept
              </Button>
              {s.reportId && (
                <Link href={`/reports/${s.reportId}`} className="text-xs text-brand-600 self-center">
                  View report
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
