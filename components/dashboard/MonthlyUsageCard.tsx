"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import type { UsageSummary } from "@/types";
import { Button } from "@/components/ui/Button";
import { UsageProgress } from "@/components/billing/UsageProgress";
import { Skeleton } from "@/components/ui/Skeleton";
import { AlertTriangle, CreditCard } from "lucide-react";
import { useTranslation } from "@/lib/i18n/use-translation";

export function MonthlyUsageCard() {
  const { t } = useTranslation();
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api
      .getBillingUsage()
      .then((data) => {
        setUsage(data);
        setFailed(false);
      })
      .catch(() => {
        setUsage(null);
        setFailed(true);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Skeleton className="h-40 w-full rounded-2xl" />;
  }

  if (failed || !usage) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm mb-6">
        <p className="text-sm text-gray-600">
          {t("dashboard.usageUnavailable")}{" "}
          <Link href="/billing" className="font-medium text-brand-600 underline">
            {t("dashboard.viewBilling")}
          </Link>
        </p>
      </div>
    );
  }

  const aiExhausted =
    usage.plan === "free" &&
    usage.usage.aiSummariesUsed >= usage.usage.aiSummariesLimit;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm mb-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-brand-600" />
            {t("dashboard.monthlyUsage")}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {usage.planName} · {usage.priceLabel}
          </p>
        </div>
        <Link href="/billing">
          <Button variant="outline" size="sm">
            {t("dashboard.manage")}
          </Button>
        </Link>
      </div>
      <div className="space-y-3">
        <UsageProgress
          label={t("dashboard.uploads")}
          used={usage.usage.uploadsUsed}
          limit={usage.usage.uploadsLimit}
        />
        <UsageProgress
          label={t("dashboard.aiSummaries")}
          used={usage.usage.aiSummariesUsed}
          limit={usage.usage.aiSummariesLimit}
        />
      </div>
      {usage.warning && (
        <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          {usage.warning}
        </p>
      )}
      {aiExhausted && (
        <div className="mt-4 flex gap-2 rounded-xl bg-amber-50 border border-amber-100 p-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            {t("dashboard.freeAiUsed")}{" "}
            <Link href="/billing" className="font-semibold underline">
              {t("dashboard.upgradeToPro")}
            </Link>{" "}
            {t("dashboard.forMore")}
          </p>
        </div>
      )}
    </div>
  );
}
