"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { MobileShell } from "@/components/MobileShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api-client";
import type { HealthRiskCard, FamilyMember, HealthRisksResponse } from "@/types";
import { useTranslation } from "@/lib/i18n/use-translation";

const CATEGORIES = [
  "",
  "sugar",
  "cholesterol",
  "bp",
  "liver",
  "kidney",
  "thyroid",
  "vitamin",
  "cbc",
  "lifestyle",
  "general",
];

export default function HealthRisksPage() {
  return (
    <ProtectedRoute>
      <HealthRisksContent />
    </ProtectedRoute>
  );
}

function HealthRisksContent() {
  const { t } = useTranslation();
  const [data, setData] = useState<HealthRisksResponse>({
    cards: [],
    stats: { total: 0, critical: 0, warning: 0, info: 0 },
  });
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [familyFilter, setFamilyFilter] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("");
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getFamilyMembers().then(setMembers).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (familyFilter) params.set("familyMemberId", familyFilter);
    if (category) params.set("category", category);
    if (level) params.set("level", level);
    if (status) params.set("status", status);
    params.set("limit", "100");
    api
      .getHealthRisks(params.toString())
      .then(setData)
      .catch(() =>
        setData({ cards: [], stats: { total: 0, critical: 0, warning: 0, info: 0 } })
      )
      .finally(() => setLoading(false));
  }, [familyFilter, category, level, status]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id: string, next: "resolved" | "dismissed") => {
    if (id.startsWith("pending-") || id.startsWith("no-vitals")) return;
    await api.updateHealthRiskStatus(id, next);
    load();
  };

  const levelVariant = (l: string) =>
    l === "critical" ? "critical" : l === "warning" ? "warning" : "default";

  const dbCards = data.cards.filter(
    (c) => !c.id.startsWith("pending-") && !c.id.startsWith("no-vitals")
  );

  return (
    <MobileShell>
      <AppHeader />
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Health Risk Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Risks are generated from your uploaded reports, vitals, and health context.
            </p>
          </div>
          <Link href="/health-chat">
            <Button variant="outline" size="sm" className="shrink-0 min-h-[40px]">
              Ask about risks
            </Button>
          </Link>
        </div>
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-3 mb-4">
          {t("healthRisks.pageNotice")}
        </p>

        <div className="grid grid-cols-4 gap-2 mb-4 text-center">
          {[
            { label: "Total", value: data.stats.total },
            { label: "Critical", value: data.stats.critical },
            { label: "Warnings", value: data.stats.warning },
            { label: "Info", value: data.stats.info },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-gray-50 p-2 border border-gray-100">
              <p className="text-lg font-bold text-gray-900">{s.value}</p>
              <p className="text-[10px] text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2 mb-4">
          <select
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm min-h-[44px]"
            value={familyFilter}
            onChange={(e) => setFamilyFilter(e.target.value)}
          >
            <option value="">All family members</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-3 gap-2">
            <select
              className="rounded-xl border border-gray-200 px-2 py-2 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {CATEGORIES.filter(Boolean).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              className="rounded-xl border border-gray-200 px-2 py-2 text-sm"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              <option value="">All levels</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
            <select
              className="rounded-xl border border-gray-200 px-2 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">Active</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        ) : dbCards.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-12">
            No health risks detected yet. Upload a report and generate an AI summary to populate
            this dashboard.
          </p>
        ) : (
          <ul className="space-y-3">
            {data.cards.map((c) => (
              <li key={c.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex justify-between gap-2 mb-2">
                  <div>
                    {c.category && (
                      <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">
                        {c.category}
                      </p>
                    )}
                    <h2 className="font-semibold text-gray-900">{c.title}</h2>
                  </div>
                  <Badge variant={levelVariant(c.level)}>{c.level}</Badge>
                </div>
                <p className="text-sm text-gray-600">{c.message}</p>
                {c.familyMember && (
                  <p className="text-xs text-brand-600 mt-1">{c.familyMember.fullName}</p>
                )}
                {c.evidence.length > 0 && (
                  <ul className="text-xs text-gray-500 mt-2 list-disc pl-4">
                    {c.evidence.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                )}
                {c.suggestedActions && c.suggestedActions.length > 0 && (
                  <ul className="text-xs text-gray-600 mt-2 list-disc pl-4">
                    {c.suggestedActions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {c.reportId && (
                    <Link
                      href={`/reports/${c.reportId}`}
                      className="text-xs font-medium text-brand-600 bg-brand-50 px-3 py-1.5 rounded-lg"
                    >
                      View Report
                    </Link>
                  )}
                  {c.documentId && (
                    <Link
                      href={`/documents/${c.documentId}`}
                      className="text-xs font-medium text-brand-600 bg-brand-50 px-3 py-1.5 rounded-lg"
                    >
                      View Document
                    </Link>
                  )}
                  {!c.id.startsWith("pending-") && !c.id.startsWith("no-vitals") && status === "active" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatus(c.id, "dismissed")}
                      >
                        Dismiss
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatus(c.id, "resolved")}
                      >
                        Mark Resolved
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </MobileShell>
  );
}
