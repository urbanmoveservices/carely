"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { HealthRiskCard, ReminderSuggestionItem } from "@/types";
import { ShieldAlert, ListChecks, RefreshCw } from "lucide-react";
import { useTranslation } from "@/lib/i18n/use-translation";

export function ReportPostSummarySections({
  reportId,
  documentId,
}: {
  reportId: string;
  documentId: string;
}) {
  const { t } = useTranslation();
  const [risks, setRisks] = useState<HealthRiskCard[]>([]);
  const [suggestions, setSuggestions] = useState<ReminderSuggestionItem[]>([]);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(() => {
    api.getReportHealthRisks(reportId).then((r) => setRisks(r.cards)).catch(() => setRisks([]));
    api
      .getReminderSuggestions(`reportId=${reportId}&status=pending`)
      .then((r) => setSuggestions(r.items))
      .catch(() => setSuggestions([]));
  }, [reportId]);

  useEffect(() => {
    load();
  }, [load]);

  const rerun = async () => {
    setUpdating(true);
    try {
      await api.extractRisksForReport(reportId);
      load();
    } finally {
      setUpdating(false);
    }
  };

  const accept = async (id: string) => {
    await api.acceptReminderSuggestion(id);
    load();
  };

  const levelVariant = (l: string) =>
    l === "critical" ? "critical" : l === "warning" ? "warning" : "default";

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                Detected Health Risks
              </div>
              <Button variant="outline" size="sm" loading={updating} onClick={rerun}>
                <RefreshCw className="h-4 w-4" />
                Update Risk Dashboard
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500 mb-3">{t("report.riskCardsHelper")}</p>
          {risks.length === 0 ? (
            <p className="text-sm text-gray-500">
              No report-based risks stored yet. Use Update Risk Dashboard after summary generation.
            </p>
          ) : (
            <ul className="space-y-3">
              {risks.map((c) => (
                <li key={c.id} className="rounded-xl border border-gray-100 p-3">
                  <div className="flex justify-between gap-2 mb-1">
                    <span className="font-medium text-sm">{c.title}</span>
                    <Badge variant={levelVariant(c.level)}>{c.level}</Badge>
                  </div>
                  <p className="text-sm text-gray-600">{c.message}</p>
                  {c.evidence.length > 0 && (
                    <ul className="text-xs text-gray-500 mt-2 list-disc pl-4">
                      {c.evidence.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Link href="/health-risks" className="text-sm text-brand-600 mt-3 inline-block">
            Open Health Risk Dashboard
          </Link>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-brand-600" />
              Suggested Next Steps
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {suggestions.length === 0 ? (
            <p className="text-sm text-gray-500">No follow-up suggestions for this report.</p>
          ) : (
            <ul className="space-y-3">
              {suggestions.map((s) => (
                <li key={s.id} className="rounded-xl bg-gray-50 p-3">
                  <p className="font-medium text-sm">{s.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{s.message}</p>
                  <Button size="sm" className="mt-2" onClick={() => accept(s.id)}>
                    Accept as reminder
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Link
            href={`/documents/${documentId}`}
            className="text-sm text-brand-600 mt-3 inline-block"
          >
            View document
          </Link>
        </CardContent>
      </Card>
    </>
  );
}
