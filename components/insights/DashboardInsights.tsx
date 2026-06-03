"use client";

import { useCallback, useEffect, useState } from "react";
import { subscribeDashboardRefresh } from "@/lib/dashboard-events";
import Link from "next/link";
import { api } from "@/lib/api-client";
import type { HealthInsight } from "@/types";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Lightbulb, ChevronRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n/use-translation";

export function DashboardInsights() {
  const { t } = useTranslation();
  const [items, setItems] = useState<HealthInsight[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .getInsights("unreadOnly=true")
      .then((r) => setItems(r.items.slice(0, 3)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    return subscribeDashboardRefresh(load);
  }, [load]);

  if (loading) {
    return <Skeleton className="h-32 rounded-2xl mb-6" />;
  }

  if (items.length === 0) return null;

  return (
    <section className="mb-6 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-brand-600" />
          {t("dashboard.smartInsights")}
        </h2>
        <Link href="/insights">
          <Button variant="ghost" size="sm" className="min-h-[40px]">
            {t("dashboard.viewAll")} <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.id} className="text-sm rounded-lg bg-white/80 border border-brand-50 px-3 py-2">
            <p className="font-medium text-gray-900">{i.title}</p>
            <p className="text-gray-600 line-clamp-2 text-xs mt-0.5">{i.message}</p>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-gray-400 mt-3">
        {t("dashboard.insightsDisclaimer")}
      </p>
    </section>
  );
}
