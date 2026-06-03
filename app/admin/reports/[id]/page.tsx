"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert } from "@/components/ui/Alert";
import { adminApi } from "@/lib/admin-api-client";
import { formatDate, truncate } from "@/lib/utils";
import type { User } from "@/types";
import {
  ArrowLeft,
  FileText,
  Heart,
  AlertTriangle,
  Apple,
  Dumbbell,
  Lightbulb,
  ShieldAlert,
  BarChart3,
  Activity,
  UserIcon,
  Download,
} from "lucide-react";

interface AdminReportDetail {
  id: string;
  summary: string;
  keyFindings: any[];
  abnormalValues: any[];
  foodRecommendations: string[];
  exerciseRecommendations: string[];
  lifestyleAdvice: string[];
  riskFlags: any[];
  chartData: any[];
  healthScore?: number;
  scoreFactors?: unknown;
  valueParserVersion?: string | null;
  summaryValidationStatus?: string | null;
  repairedAt?: string | null;
  usesStructuredValues?: boolean;
  parsedLabValues?: Array<{
    testName: string;
    markerKey: string;
    value: number | null;
    valueText: string | null;
    unit: string | null;
    status: string | null;
    confidence: number | null;
    referenceRange: string | null;
    source: string;
  }>;
  aiModelUsed: string | null;
  processingTimeMs: number | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
  document: {
    id: string;
    originalFilename: string;
    fileType: string;
    fileSize: number;
    uploadStatus: string;
    createdAt: string;
  };
}

export default function AdminReportDetailPage() {
  return (
    <AdminLayout>
      {(admin) => <AdminReportDetailContent admin={admin} />}
    </AdminLayout>
  );
}

function AdminReportDetailContent({ admin }: { admin: User }) {
  const params = useParams();
  const reportId = params.id as string;

  const [report, setReport] = useState<AdminReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [repairing, setRepairing] = useState(false);

  useEffect(() => {
    adminApi
      .get<AdminReportDetail>(`/api/admin/reports/${reportId}`)
      .then(setReport)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [reportId]);

  if (loading) {
    return (
      <div>
        <AdminHeader title="Report Details" user={admin} />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div>
        <AdminHeader title="Report Details" user={admin} />
        <Alert variant="error">{error || "Report not found"}</Alert>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/reports"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Reports
        </Link>
      </div>

      <div className="flex items-center justify-between mb-4">
        <AdminHeader
          title="Report Details"
          description={report.document.originalFilename}
          user={admin}
        />
        <Button
          variant="outline"
          size="sm"
          loading={repairing}
          onClick={async () => {
            setRepairing(true);
            setError("");
            try {
              await adminApi.post(`/api/admin/reports/${reportId}/repair-values`, {});
              const refreshed = await adminApi.get<AdminReportDetail>(
                `/api/admin/reports/${reportId}`
              );
              setReport(refreshed);
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : "Repair failed");
            } finally {
              setRepairing(false);
            }
          }}
        >
          {repairing ? "Repairing…" : "Repair values & summary"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          loading={downloading}
          onClick={async () => {
            setDownloading(true);
            try {
              await adminApi.downloadReportPdf(reportId);
            } catch (err: any) {
              setError(err.message || "PDF could not be generated.");
            } finally {
              setDownloading(false);
            }
          }}
        >
          <Download className="h-4 w-4" />
          {downloading ? "Downloading..." : "Download PDF"}
        </Button>
      </div>

      {error && (
        <Alert variant="error" className="mb-4">{error}</Alert>
      )}

      {/* User + Document info */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>User</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium text-gray-900">{report.user.name}</p>
            <p className="text-sm text-gray-500">{report.user.email}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Document</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium text-gray-900">
              {report.document.originalFilename}
            </p>
            <p className="text-sm text-gray-500">
              {report.document.fileType} &middot;{" "}
              {formatDate(report.document.createdAt)}
            </p>
            <div className="mt-1">
              <Badge variant={(report.document.uploadStatus as any) || "default"}>
                {report.document.uploadStatus}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Health Score + Summary */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        {report.healthScore != null && (
          <Card>
            <CardContent className="py-6">
              <div className="text-center">
                <p className="text-4xl font-bold text-brand-600">
                  {report.healthScore}
                </p>
                <p className="text-sm text-gray-500">Health Score</p>
              </div>
            </CardContent>
          </Card>
        )}
        <Card className={report.healthScore != null ? "md:col-span-3" : "md:col-span-4"}>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-brand-600" />
                Summary
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {report.summary}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Parser / validation debug */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Parsed lab values & validation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">
              Parser: {report.valueParserVersion || "—"}
            </Badge>
            <Badge variant={report.summaryValidationStatus === "valid" || report.summaryValidationStatus === "repaired" ? "completed" : "warning"}>
              Validation: {report.summaryValidationStatus || "—"}
            </Badge>
            {report.usesStructuredValues && (
              <Badge variant="completed">Structured values used</Badge>
            )}
          </div>
          {report.parsedLabValues && report.parsedLabValues.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-1 pr-3">Test</th>
                    <th className="py-1 pr-3">Value</th>
                    <th className="py-1 pr-3">Ref</th>
                    <th className="py-1 pr-3">Status</th>
                    <th className="py-1">Conf.</th>
                  </tr>
                </thead>
                <tbody>
                  {report.parsedLabValues.map((row, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-1 pr-3">{row.testName}</td>
                      <td className="py-1 pr-3">
                        {row.valueText ?? row.value} {row.unit || ""}
                      </td>
                      <td className="py-1 pr-3">{row.referenceRange || "—"}</td>
                      <td className="py-1 pr-3">{row.status || "—"}</td>
                      <td className="py-1">
                        {row.confidence != null
                          ? `${Math.round(row.confidence * 100)}%`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No parsed lab values stored yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Key findings preview */}
      {report.keyFindings.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-brand-600" />
                Key Findings ({report.keyFindings.length})
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.keyFindings.map((f: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                >
                  <div>
                    <span className="text-sm font-medium">{f.title}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      {f.value}
                    </span>
                  </div>
                  <Badge
                    variant={
                      f.status === "normal"
                        ? "completed"
                        : f.status === "high" || f.status === "critical"
                        ? "failed"
                        : f.status === "low"
                        ? "warning"
                        : "default"
                    }
                  >
                    {f.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Abnormal values */}
      {report.abnormalValues.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Abnormal Values ({report.abnormalValues.length})
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.abnormalValues.map((a: any, i: number) => (
                <div key={i} className="rounded-lg bg-gray-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{a.name}: {a.value}</span>
                    <Badge
                      variant={
                        a.severity === "critical" || a.severity === "high"
                          ? "critical"
                          : a.severity === "moderate"
                          ? "warning"
                          : "default"
                      }
                    >
                      {a.severity}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Normal: {a.normalRange} — {a.meaning}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk flags */}
      {report.riskFlags.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-500" />
                Risk Flags ({report.riskFlags.length})
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.riskFlags.map((flag: any, i: number) => (
                <Alert
                  key={i}
                  variant={
                    flag.level === "critical"
                      ? "error"
                      : flag.level === "warning"
                      ? "warning"
                      : "info"
                  }
                >
                  {flag.message}
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Meta */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 text-xs text-gray-400">
            <span>Report ID: {report.id}</span>
            <span>Created: {formatDate(report.createdAt)}</span>
            {report.aiModelUsed && <span>Model: {report.aiModelUsed}</span>}
            {report.processingTimeMs && (
              <span>{(report.processingTimeMs / 1000).toFixed(1)}s processing</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
