"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AppHeader } from "@/components/AppHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { api } from "@/lib/api-client";
import { formatBytes } from "@/lib/utils";
import { formatDateForLanguage } from "@/lib/i18n/locale";
import type { ReportDetail } from "@/types";
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
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  Download,
  CircleHelp,
  RefreshCw,
} from "lucide-react";
import { ReportSharePanel } from "@/components/reports/ReportSharePanel";
import { ReportPostSummarySections } from "@/components/reports/ReportPostSummarySections";
import { useTranslation } from "@/lib/i18n/use-translation";
import {
  translateMetricStatus,
  translateSeverityLabel,
} from "@/lib/i18n/status-labels";
import { formatAiSummaryClientError } from "@/lib/summary-error-messages";

const ReportCharts = dynamic(() => import("@/components/ReportCharts"), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />,
});

export default function ReportPage() {
  return (
    <ProtectedRoute>
      <ReportContent />
    </ProtectedRoute>
  );
}

const severityBadge: Record<string, "warning" | "critical" | "default" | "completed"> = {
  low: "default",
  moderate: "warning",
  high: "critical",
  critical: "critical",
  unknown: "default",
};

const statusIcon: Record<string, typeof TrendingUp> = {
  normal: Minus,
  low: TrendingDown,
  high: TrendingUp,
  critical: AlertTriangle,
  unknown: Info,
};

const statusColor: Record<string, string> = {
  normal: "text-green-600",
  low: "text-blue-600",
  high: "text-orange-600",
  critical: "text-red-600",
  unknown: "text-gray-500",
};

function ReportContent() {
  const params = useParams();
  const reportId = params.id as string;

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [baseReport, setBaseReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [translationWarning, setTranslationWarning] = useState<string | null>(
    null
  );
  const [showTranslationNote, setShowTranslationNote] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const { t, tParams, language, translationVersion } = useTranslation();

  useEffect(() => {
    api
      .get<ReportDetail>(`/api/reports/${reportId}`)
      .then((data) => {
        setBaseReport(data);
        setReport(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [reportId]);

  useEffect(() => {
    if (!baseReport) return;

    if (language === "en") {
      setReport(baseReport);
      setTranslating(false);
      setShowTranslationNote(false);
      setTranslationWarning(null);
      return;
    }

    let cancelled = false;
    setTranslating(true);
    setTranslationWarning(null);

    api
      .getTranslatedReport(reportId, language)
      .then((res) => {
        if (cancelled) return;
        setReport({
          ...baseReport,
          summary: res.content.summary,
          keyFindings: res.content.keyFindings,
          abnormalValues: res.content.abnormalValues,
          foodRecommendations: res.content.foodRecommendations,
          exerciseRecommendations: res.content.exerciseRecommendations,
          lifestyleAdvice: res.content.lifestyleAdvice,
          riskFlags: res.content.riskFlags,
          chartData: res.content.chartData,
        });
        setShowTranslationNote(res.translated);
        if (res.warning) setTranslationWarning(res.warning);
        else if (res.partial)
          setTranslationWarning(t("report.translationWarning"));
      })
      .catch((err: Error & { code?: string }) => {
        if (!cancelled) {
          setReport(baseReport);
          if (err?.code === "AI_TRANSLATION_CONSENT_REQUIRED") {
            setTranslationWarning(
              t(
                "common.translationConsent",
                "Enable AI translation in Settings to translate medical report content."
              )
            );
          } else {
            setTranslationWarning(t("report.translationWarning"));
          }
          setShowTranslationNote(false);
        }
      })
      .finally(() => {
        if (!cancelled) setTranslating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reportId, language, translationVersion, baseReport]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader />
        <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-4 w-64 mb-8" />
          <div className="space-y-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader />
        <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <Alert variant="error">{error || "Report not found"}</Alert>
          <div className="mt-4">
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("common.backToDashboard")}
          </Link>
        </div>

        {translating && (
          <p className="text-sm text-brand-700 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2 mb-4">
            {t("report.translating")}
          </p>
        )}
        {translationWarning && !translating && (
          <Alert variant="warning" className="mb-4">
            {translationWarning}
          </Alert>
        )}
        {showTranslationNote && language !== "en" && !translating && (
          <p className="text-xs text-gray-500 mb-4">{t("report.translationNote")}</p>
        )}

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t("report.title")}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <FileText className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-500">
                {report.document.originalFilename}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {t("report.generated")}{" "}
              {formatDateForLanguage(report.createdAt, language)}
              {report.aiModelUsed && ` · ${t("report.model")}: ${report.aiModelUsed}`}
              {report.processingTimeMs &&
                ` · ${(report.processingTimeMs / 1000).toFixed(1)}s`}
            </p>
            {report.family_member ? (
              <p className="text-xs text-brand-600 mt-1 font-medium">
                {t("report.reportFor")}: {report.family_member.fullName} (
                {report.family_member.relation})
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-1">
                {t("report.reportFor")}: {t("report.myself")}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/reports/${report.id}/chat`}>
              <Button variant="outline" size="sm" className="min-h-[44px]">
                Ask Vaidya GPT
              </Button>
            </Link>
            <Link href={`/reports/${report.id}/doctor-pack`}>
              <Button variant="outline" size="sm" className="min-h-[44px]">
                Doctor visit pack
              </Button>
            </Link>
            {report.documentId && (
              <Link href={`/reports/${report.id}/edit-values`}>
                <Button variant="outline" size="sm" className="min-h-[44px]">
                  Edit lab values
                </Button>
              </Link>
            )}
            <Link href={`/reports/${report.id}/doctor-questions`}>
              <Button variant="outline" size="sm" className="min-h-[44px]">
                <CircleHelp className="h-4 w-4" />
                {t("report.doctorQuestions")}
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              loading={regenerating}
              className="min-h-[44px]"
              onClick={async () => {
                if (!report?.documentId) return;
                const ok = window.confirm(
                  "This will replace the current AI summary with a new one based on the extracted text."
                );
                if (!ok) return;
                setRegenerating(true);
                setError("");
                try {
                  const res = await api.regenerateDocumentSummary(
                    report.documentId
                  );
                  const data = await api.get<ReportDetail>(
                    `/api/reports/${res.report_id}`
                  );
                  setReport(data);
                  setBaseReport(data);
                } catch (err: any) {
                  setError(formatAiSummaryClientError(err));
                } finally {
                  setRegenerating(false);
                }
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Regenerate Summary
            </Button>
            <Button
              variant="outline"
              size="sm"
              loading={downloading}
              className="min-h-[44px]"
              onClick={async () => {
                setDownloading(true);
                try {
                  await api.downloadReportPdf(report.id, language);
                } catch (err: any) {
                  setError(err.message || "PDF could not be generated. Please try again.");
                } finally {
                  setDownloading(false);
                }
              }}
            >
              <Download className="h-4 w-4" />
              {downloading ? t("common.loading") : t("report.downloadPdf")}
            </Button>
            <Badge variant="ai_completed">{t("report.aiCompletedBadge")}</Badge>
          </div>
        </div>

        {error && (
          <Alert variant="error" className="mb-6">{error}</Alert>
        )}

        <ReportSharePanel reportId={report.id} />

        <div data-translation-managed="report">
        {/* Health Score + Summary */}
        <div className="grid gap-6 lg:grid-cols-4 mb-6">
          {report.healthScore != null && (
            <Card className="lg:col-span-1">
              <CardContent className="py-8">
                <div className="flex flex-col items-center text-center">
                  <div
                    className={`relative w-24 h-24 rounded-full flex items-center justify-center mb-3 ${
                      report.healthScore >= 80
                        ? "bg-green-50"
                        : report.healthScore >= 60
                        ? "bg-yellow-50"
                        : "bg-red-50"
                    }`}
                  >
                    <span
                      className={`text-3xl font-bold ${
                        report.healthScore >= 80
                          ? "text-green-600"
                          : report.healthScore >= 60
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {report.healthScore}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-700">
                    {t("report.healthScore")}
                  </p>
                  <p className="text-xs text-gray-400">{t("report.outOf100")}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card
            className={report.healthScore != null ? "lg:col-span-3" : "lg:col-span-4"}
          >
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-brand-600" />
                  {t("report.summary")}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {report.summary}
              </p>
              <p className="text-xs text-gray-400 mt-3">
                {t("report.contextBasedNote")}
              </p>
            </CardContent>
          </Card>
        </div>

        {report.contextualInsights && report.contextualInsights.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-brand-600" />
                  {t("report.contextInsights")}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {report.contextualInsights.map((insight, i) => (
                  <div
                    key={i}
                    className={`rounded-xl border p-4 ${
                      insight.level === "critical"
                        ? "border-red-200 bg-red-50/50"
                        : insight.level === "warning"
                        ? "border-orange-200 bg-orange-50/50"
                        : "border-blue-100 bg-blue-50/30"
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-900">
                      {insight.title}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">{insight.message}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Key Findings */}
        {report.keyFindings.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-brand-600" />
                  {t("report.keyFindings")}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {report.keyFindings.map((f, i) => {
                  const IconStatus = statusIcon[f.status] || Info;
                  const color = statusColor[f.status] || "text-gray-500";
                  return (
                    <div
                      key={i}
                      className="rounded-lg border border-gray-100 bg-gray-50 p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {f.title}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <IconStatus className={`h-4 w-4 ${color}`} />
                          <span className={`text-xs font-medium ${color}`}>
                            {translateMetricStatus(t, f.status)}
                          </span>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-gray-900 mb-1">
                        {f.value}
                      </p>
                      <p className="text-xs text-gray-500">{f.explanation}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Abnormal Values */}
        {report.abnormalValues.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  {t("report.abnormalValues")}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {report.abnormalValues.map((a, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-gray-100 bg-gray-50 p-4"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {a.name}
                      </span>
                      <Badge
                        variant={severityBadge[a.severity] || "default"}
                      >
                        {translateSeverityLabel(t, a.severity)}
                      </Badge>
                    </div>
                    <div className="flex gap-4 text-sm mb-2">
                      <span>
                        <strong>{t("report.value")}:</strong> {a.value}
                      </span>
                      <span className="text-gray-400">
                        {t("report.normal")}: {a.normalRange}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{a.meaning}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        {report.chartData.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-brand-600" />
                  {t("report.healthMetrics")}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportCharts data={report.chartData} />
            </CardContent>
          </Card>
        )}

        {/* Recommendations — full width for detailed AI guidance */}
        <div className="space-y-6 mb-6">
          {report.foodRecommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <Apple className="h-5 w-5 text-green-600" />
                    {t("report.food")}
                  </div>
                </CardTitle>
                <p className="text-xs text-gray-500 mt-1 font-normal">
                  Personalized diet guidance based on your report values and health context.
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {report.foodRecommendations.map((r, i) => (
                    <li
                      key={i}
                      className="text-sm text-gray-700 leading-relaxed flex gap-3 rounded-lg bg-green-50/60 border border-green-100/80 px-3 py-2.5"
                    >
                      <span className="text-green-600 font-semibold shrink-0 mt-0.5">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {report.exerciseRecommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <Dumbbell className="h-5 w-5 text-blue-600" />
                    {t("report.exercise")}
                  </div>
                </CardTitle>
                <p className="text-xs text-gray-500 mt-1 font-normal">
                  Activity plan tailored to your condition, fitness level, and lab results.
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {report.exerciseRecommendations.map((r, i) => (
                    <li
                      key={i}
                      className="text-sm text-gray-700 leading-relaxed flex gap-3 rounded-lg bg-blue-50/60 border border-blue-100/80 px-3 py-2.5"
                    >
                      <span className="text-blue-600 font-semibold shrink-0 mt-0.5">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {report.lifestyleAdvice.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-600" />
                    {t("report.lifestyle")}
                  </div>
                </CardTitle>
                <p className="text-xs text-gray-500 mt-1 font-normal">
                  Medications, treatment steps, sleep, stress, and daily habits for your situation.
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {report.lifestyleAdvice.map((r, i) => {
                    const isMed = /^medication:/i.test(r.trim());
                    const isTreatment = /^treatment:/i.test(r.trim());
                    return (
                      <li
                        key={i}
                        className={`text-sm leading-relaxed flex gap-3 rounded-lg px-3 py-2.5 border ${
                          isMed
                            ? "bg-purple-50/70 border-purple-100 text-gray-800"
                            : isTreatment
                              ? "bg-amber-50/70 border-amber-100 text-gray-800"
                              : "bg-yellow-50/50 border-yellow-100/80 text-gray-700"
                        }`}
                      >
                        <span className="text-yellow-700 font-semibold shrink-0 mt-0.5">•</span>
                        <span>{r}</span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Risk Flags */}
        {report.riskFlags.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-red-500" />
                  {t("report.riskFlags")}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {report.riskFlags.map((flag, i) => (
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
        </div>

        {report && (
          <ReportPostSummarySections
            reportId={report.id}
            documentId={report.documentId}
          />
        )}

      </main>
    </div>
  );
}
