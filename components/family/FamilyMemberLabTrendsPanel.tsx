"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";

type TrendRow = {
  id: string;
  markerName: string;
  markerKey: string;
  value: number | null;
  unit: string | null;
  status: string | null;
  measuredAt: string | null;
  reportId: string | null;
};

export function FamilyMemberLabTrendsPanel({ memberId }: { memberId: string }) {
  const [items, setItems] = useState<TrendRow[]>([]);

  useEffect(() => {
    api
      .get<{ items: TrendRow[] }>(`/api/family-members/${memberId}/lab-trends`)
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, [memberId]);

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-6 text-center">
        Lab trends appear after AI summaries with chart or abnormal values.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((t) => (
        <li key={t.id} className="rounded-xl border border-gray-100 p-3 text-sm">
          <div className="flex justify-between gap-2">
            <span className="font-medium">{t.markerName}</span>
            <span className="text-gray-600">
              {t.value != null ? `${t.value} ${t.unit || ""}`.trim() : "—"}
            </span>
          </div>
          {t.status && <p className="text-xs text-gray-500 mt-1 capitalize">{t.status}</p>}
          {t.reportId && (
            <Link href={`/reports/${t.reportId}`} className="text-xs text-brand-600 mt-1 inline-block">
              Source report
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
