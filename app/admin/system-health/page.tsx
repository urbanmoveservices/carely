"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { adminApi } from "@/lib/admin-api-client";
import { BRAND } from "@/lib/brand";
import type { User } from "@/types";

type Health = {
  productName?: string;
  operator?: string;
  warning?: string;
  app?: { ok: boolean; port: number };
  database?: { ok: boolean };
  prisma?: { ok: boolean };
  openai?: { ok: boolean; configured: boolean };
  imageOcr?: { provider: string; ok: boolean };
  tesseract?: { enabled: boolean; ok: boolean };
  uploadStorage?: { ok: boolean };
  fileEncryption?: { configured: boolean };
  translation?: { provider: string; ok: boolean; configured: boolean };
  email?: { configured: boolean };
  push?: { configured: boolean };
  jobs?: { queued: number; running: number; failed: number };
  documents?: {
    total: number;
    failed: number;
    textExtracted: number;
    aiCompleted: number;
  };
  reports?: { total: number; generatedThisMonth: number };
  risks?: { active: number; critical: number; warning: number };
  errors?: { unresolved: number; last24h: number };
};

function StatusBadge({ ok, configured }: { ok?: boolean; configured?: boolean }) {
  const good = ok ?? configured ?? false;
  return <Badge variant={good ? "completed" : "warning"}>{good ? "OK" : "Check"}</Badge>;
}

export default function AdminSystemHealthPage() {
  return (
    <AdminLayout>
      {(user) => <Content user={user} />}
    </AdminLayout>
  );
}

function Content({ user }: { user: User }) {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    adminApi.get<Health>("/api/admin/system-health").then(setHealth).catch(console.error);
  }, []);

  const services: [string, keyof Health][] = [
    ["Database", "database"],
    ["Prisma", "prisma"],
    ["OpenAI", "openai"],
    ["Image OCR (OpenAI Vision)", "imageOcr"],
    ["Tesseract fallback", "tesseract"],
    ["Upload storage", "uploadStorage"],
    ["File encryption", "fileEncryption"],
    ["Translation", "translation"],
    ["Email", "email"],
    ["Push", "push"],
  ];

  return (
    <div>
      <AdminHeader title="System Health" description="Live production readiness" user={user} />

      <Card className="mb-6">
        <CardContent className="py-4 text-sm text-gray-700 space-y-1">
          <p>
            <span className="font-medium text-gray-900">Product:</span>{" "}
            {health?.productName ?? BRAND.name}
          </p>
          <p>
            <span className="font-medium text-gray-900">Operator:</span>{" "}
            {health?.operator ?? BRAND.operator}
          </p>
          {health?.app && (
            <p>
              <span className="font-medium text-gray-900">App port:</span> {health.app.port}
            </p>
          )}
          {health?.warning && (
            <p className="text-amber-700 text-xs mt-2">{health.warning}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        {services.map(([label, key]) => {
          const h = health?.[key] as { ok?: boolean; configured?: boolean; enabled?: boolean } | undefined;
          return (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex justify-between items-center gap-2">
                  <span>{label}</span>
                  <StatusBadge ok={h?.ok} configured={h?.configured ?? !h?.enabled} />
                </CardTitle>
              </CardHeader>
              {key === "tesseract" && h && "enabled" in h && (
                <CardContent className="pt-0 text-xs text-gray-500">
                  {h.enabled ? "Enabled (ENABLE_TESSERACT_OCR=true)" : "Disabled by default"}
                </CardContent>
              )}
              {key === "imageOcr" && health?.imageOcr && (
                <CardContent className="pt-0 text-xs text-gray-500">
                  Provider: {health.imageOcr.provider}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {health?.jobs && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm">Background jobs</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-700 space-y-1">
            <p>Queued: <strong>{health.jobs.queued}</strong></p>
            <p>Running: <strong>{health.jobs.running}</strong></p>
            <p>Failed: <strong>{health.jobs.failed}</strong></p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {health?.documents && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Documents</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-700 space-y-1">
              <p>Total: <strong>{health.documents.total}</strong></p>
              <p>Failed: <strong>{health.documents.failed}</strong></p>
              <p>Text extracted: <strong>{health.documents.textExtracted}</strong></p>
              <p>AI completed: <strong>{health.documents.aiCompleted}</strong></p>
            </CardContent>
          </Card>
        )}
        {health?.reports && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Reports</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-700 space-y-1">
              <p>Total: <strong>{health.reports.total}</strong></p>
              <p>This month: <strong>{health.reports.generatedThisMonth}</strong></p>
            </CardContent>
          </Card>
        )}
        {health?.risks && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Health risks</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-700 space-y-1">
              <p>Active: <strong>{health.risks.active}</strong></p>
              <p>Critical: <strong>{health.risks.critical}</strong></p>
              <p>Warning: <strong>{health.risks.warning}</strong></p>
            </CardContent>
          </Card>
        )}
        {health?.errors && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Errors</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-700 space-y-1">
              <p>Unresolved: <strong>{health.errors.unresolved}</strong></p>
              <p>Last 24h: <strong>{health.errors.last24h}</strong></p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
