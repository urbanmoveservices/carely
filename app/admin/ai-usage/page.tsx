"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { adminApi } from "@/lib/admin-api-client";
import type { User } from "@/types";

type AiUsageStats = {
  available?: boolean;
  message?: string;
  tokensToday?: number;
  tokensThisMonth?: number;
  cacheHitRate?: number;
  localAnswersCount?: number;
  avgTokensPerSummary?: number;
  avgTokensPerChat?: number;
  rawTextFallbackUsage?: number;
  tokensByFeature?: Array<{ feature: string; tokens: number; calls: number }>;
  tokensByUser?: Array<{ userId: string | null; tokens: number; calls: number }>;
  topExpensiveReports?: Array<{ reportId: string | null; tokens: number }>;
};

export default function AdminAiUsagePage() {
  return (
    <AdminLayout>
      {(user) => <Content user={user} />}
    </AdminLayout>
  );
}

function Content({ user }: { user: User }) {
  const [stats, setStats] = useState<AiUsageStats | null>(null);

  useEffect(() => {
    adminApi.get<AiUsageStats>("/api/admin/ai-usage").then(setStats).catch(console.error);
  }, []);

  if (!stats) {
    return (
      <div>
        <AdminHeader title="AI Usage" description="Token optimization metrics" user={user} />
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!stats.available) {
    return (
      <div>
        <AdminHeader title="AI Usage" description="Token optimization metrics" user={user} />
        <Card>
          <CardContent className="py-6 text-sm text-amber-800">{stats.message}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <AdminHeader title="AI Usage" description="OpenAI tokens, cache, and local answers" user={user} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <MetricCard title="Tokens today" value={stats.tokensToday ?? 0} />
        <MetricCard title="Tokens this month" value={stats.tokensThisMonth ?? 0} />
        <MetricCard title="Cache hit rate" value={`${stats.cacheHitRate ?? 0}%`} />
        <MetricCard title="Local answers" value={stats.localAnswersCount ?? 0} />
        <MetricCard title="Avg tokens / summary" value={stats.avgTokensPerSummary ?? 0} />
        <MetricCard title="Avg tokens / chat" value={stats.avgTokensPerChat ?? 0} />
        <MetricCard title="Summary OpenAI calls" value={stats.rawTextFallbackUsage ?? 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>By feature</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2">
              {(stats.tokensByFeature ?? []).map((row) => (
                <li key={row.feature} className="flex justify-between">
                  <span>{row.feature}</span>
                  <span className="text-gray-600">
                    {row.tokens} tok · {row.calls} calls
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top users (month)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2">
              {(stats.tokensByUser ?? []).map((row) => (
                <li key={row.userId ?? "anon"} className="flex justify-between">
                  <span className="font-mono text-xs">{row.userId?.slice(0, 12)}…</span>
                  <span className="text-gray-600">{row.tokens} tok</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top expensive reports</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2">
              {(stats.topExpensiveReports ?? []).map((row) => (
                <li key={row.reportId ?? "none"} className="flex justify-between">
                  <span className="font-mono text-xs">{row.reportId}</span>
                  <span>{row.tokens} tokens</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs text-gray-500 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-semibold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
