"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { MobileShell } from "@/components/MobileShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert } from "@/components/ui/Alert";
import { api } from "@/lib/api-client";
import type { ReportComparisonResponse } from "@/types";
import { ArrowLeft, GitCompare } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function CompareReportsPage() {
  return (
    <ProtectedRoute>
      <CompareReportsContent />
    </ProtectedRoute>
  );
}

function CompareReportsContent() {
  const params = useParams();
  const memberId = params.id as string;
  const [data, setData] = useState<ReportComparisonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getReportComparison(memberId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [memberId]);

  if (loading) {
    return (
      <MobileShell>
        <AppHeader />
        <main className="mx-auto max-w-2xl px-4 py-6">
          <Skeleton className="h-64 rounded-2xl" />
        </main>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <Link
          href={`/family/${memberId}`}
          className="inline-flex items-center text-sm text-gray-600 mb-4 min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to profile
        </Link>

        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-2">
          <GitCompare className="h-6 w-6 text-brand-600" />
          Compare Reports
        </h1>
        {data && (
          <p className="text-sm text-gray-500 mb-6">
            {data.familyMember.fullName} · {data.reports.length} AI report
            {data.reports.length !== 1 ? "s" : ""}
          </p>
        )}

        {error && <Alert variant="error">{error}</Alert>}

        {data && data.reports.length < 2 && (
          <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-600">
            Need at least 2 AI-completed reports for this family member to compare.
            <Link href={`/upload?familyMemberId=${memberId}`} className="block mt-4">
              <Button>Upload report</Button>
            </Link>
          </div>
        )}

        {data && data.reports.length >= 2 && (
          <div className="space-y-6">
            <section>
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Timeline</h2>
              <ul className="space-y-3">
                {data.reports.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl border border-gray-100 bg-white p-3"
                  >
                    <div className="flex justify-between gap-2">
                      <p className="font-medium text-sm truncate">{r.originalFilename}</p>
                      <Link href={`/reports/${r.id}`}>
                        <Button size="sm" variant="outline" className="shrink-0 min-h-[36px]">
                          View
                        </Button>
                      </Link>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(r.createdAt).toLocaleDateString()}
                      {r.healthScore != null && ` · Score ${r.healthScore}`}
                    </p>
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2">{r.summary}</p>
                  </li>
                ))}
              </ul>
            </section>

            {data.commonFindings.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-900 mb-2">
                  Recurring findings
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {data.commonFindings.map((f) => (
                    <Badge key={f.title} variant="info">
                      {f.title} ({f.count})
                    </Badge>
                  ))}
                </ul>
              </section>
            )}

            {data.abnormalHistory.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-900 mb-3">
                  Abnormal values over time
                </h2>
                {data.abnormalHistory.map((group) => (
                  <div
                    key={group.name}
                    className="rounded-xl border border-gray-100 bg-white p-3 mb-2"
                  >
                    <p className="font-medium text-sm">{group.name}</p>
                    <ul className="mt-2 space-y-1">
                      {group.entries.map((e, idx) => (
                        <li key={idx} className="text-xs text-gray-600 flex justify-between">
                          <span>{e.value}</span>
                          <span>{new Date(e.reportDate).toLocaleDateString()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
            )}

            {data.chartData.length >= 2 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-900 mb-2">Chart values</h2>
                <div className="h-48 rounded-xl border border-gray-100 bg-white p-2 overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={data.chartData.map((c) => ({
                        date: new Date(c.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        }),
                        value: c.value,
                        label: c.label,
                      }))}
                    >
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} width={28} />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#0d9488" dot />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            <p className="text-xs text-gray-400 text-center">
              AI-assisted comparison to support diagnosis and treatment planning.
            </p>
          </div>
        )}
      </main>
    </MobileShell>
  );
}
