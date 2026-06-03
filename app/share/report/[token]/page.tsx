"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import type { PublicSharedReport } from "@/types";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { PublicFooter } from "@/components/PublicFooter";

export default function PublicSharedReportPage() {
  const { token } = useParams();
  const [data, setData] = useState<PublicSharedReport | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getPublicSharedReport(token as string)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 text-center">
        <p className="text-red-600">{error}</p>
        <p className="text-sm text-gray-500 mt-2">This link may have expired or been revoked.</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full max-w-lg mx-auto" />
      </div>
    );
  }

  const r = data.report;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand-700 text-white px-4 py-6">
        <h1 className="text-lg font-bold">Shared Medical Report</h1>
        <p className="text-brand-100 text-sm mt-1">Read-only · Vaidya GPT</p>
        {data.note && <p className="text-sm mt-2 bg-white/10 rounded-lg p-2">{data.note}</p>}
      </header>
      <main className="mx-auto max-w-lg px-4 py-6 space-y-4 pb-12">
        <p className="text-sm text-gray-600">
          {r.document.originalFilename} · {formatDate(r.createdAt)}
        </p>
        {r.familyMember && (
          <p className="text-sm text-brand-700 font-medium">
            For: {r.familyMember.fullName} ({r.familyMember.relation})
          </p>
        )}
        <section className="rounded-2xl bg-white p-4 border border-gray-100 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-2">Summary</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.summary}</p>
        </section>
        {r.keyFindings?.length > 0 && (
          <section className="rounded-2xl bg-white p-4 border border-gray-100">
            <h2 className="font-semibold mb-2">Key findings</h2>
            <ul className="space-y-2 text-sm">
              {r.keyFindings.map((k, i) => (
                <li key={i}>
                  <strong>{k.title}</strong>: {k.value}
                </li>
              ))}
            </ul>
          </section>
        )}
        {r.abnormalValues?.length > 0 && (
          <section className="rounded-2xl bg-white p-4 border border-gray-100">
            <h2 className="font-semibold mb-2">Values to review</h2>
            <ul className="space-y-2 text-sm">
              {r.abnormalValues.map((a, i) => (
                <li key={i}>
                  {a.name}: {a.value}
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-xl p-3">
          {data.disclaimer}
        </p>
        <p className="text-xs text-center text-gray-400">
          This link is read-only and may expire ({formatDate(data.expiresAt)}).
        </p>
      </main>
      <PublicFooter compact />
    </div>
  );
}
