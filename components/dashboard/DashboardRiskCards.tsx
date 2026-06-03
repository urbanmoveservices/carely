"use client";

import { useCallback, useEffect, useState } from "react";
import { subscribeDashboardRefresh } from "@/lib/dashboard-events";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import type { HealthRiskCard } from "@/types";
import { ShieldAlert } from "lucide-react";
import { useTranslation } from "@/lib/i18n/use-translation";
import { translateMetricStatus } from "@/lib/i18n/status-labels";

export function DashboardRiskCards() {
  const { t } = useTranslation();
  const [cards, setCards] = useState<HealthRiskCard[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .getHealthRisks("status=active&limit=20")
      .then((r) =>
        setCards(
          r.cards
            .filter((c) => !c.id.startsWith("pending-") && !c.id.startsWith("no-vitals"))
            .slice(0, 3)
        )
      )
      .catch(() => setCards([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    return subscribeDashboardRefresh(load);
  }, [load]);

  if (loading) return <Skeleton className="h-24 w-full mb-6 rounded-2xl" />;
  if (cards.length === 0) return null;

  const levelVariant = (l: string) =>
    l === "critical" ? "critical" : l === "warning" ? "warning" : "default";

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-600" />
          <h2 className="font-semibold text-gray-900">{t("dashboard.healthRisks")}</h2>
        </div>
        <Link href="/health-risks" className="text-sm text-brand-600 font-medium">
          {t("dashboard.viewAll")}
        </Link>
      </div>
      <ul className="space-y-2">
        {cards.map((c) => (
          <li key={c.id} className="rounded-xl bg-gray-50 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-sm text-gray-900">{c.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{c.message}</p>
              </div>
              <Badge variant={levelVariant(c.level)}>
                {translateMetricStatus(t, c.level)}
              </Badge>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-gray-400 mt-2">
        {t("dashboard.savedDataOnly")}
      </p>
    </div>
  );
}
