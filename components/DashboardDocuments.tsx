"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n/use-translation";
import { translateUploadStatus } from "@/lib/i18n/status-labels";
import type { DocumentItem } from "@/types";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Skeleton } from "./ui/Skeleton";
import { EmptyState } from "./ui/EmptyState";
import { Alert } from "./ui/Alert";
import { formatBytes, formatDate } from "@/lib/utils";
import {
  formatAiSummaryClientError,
  sanitizeDocumentErrorMessage,
} from "@/lib/summary-error-messages";
import {
  FileText,
  Download,
  Image,
  File,
  Loader2,
  Sparkles,
  RefreshCw,
  Eye,
  ChevronRight,
} from "lucide-react";

type StatusBadgeVariant =
  | "uploaded"
  | "processing"
  | "text_extracted"
  | "ai_completed"
  | "completed"
  | "failed"
  | "default";

const UPLOAD_STATUS_VARIANTS = new Set([
  "uploaded",
  "processing",
  "text_extracted",
  "generating_summary",
  "ai_completed",
  "summary_failed",
  "failed",
]);

function statusBadgeVariant(status: string): StatusBadgeVariant {
  if (UPLOAD_STATUS_VARIANTS.has(status)) return status as StatusBadgeVariant;
  return "default";
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith("image/")) return Image;
  if (fileType.includes("pdf")) return FileText;
  return File;
}

export function DashboardDocuments() {
  const { t } = useTranslation();
  const router = useRouter();
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DocumentItem[]>("/api/documents")
      .then(setDocs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleGenerate = (docId: string) => {
    setError("");
    router.push(`/documents/${docId}/generate-summary`);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-8 sm:p-12 text-center">
        <div className="mx-auto rounded-full bg-brand-50 p-4 w-fit mb-4">
          <FileText className="h-8 w-8 text-brand-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {t("dashboard.noReportsYet")}
        </h3>
        <p className="text-sm text-gray-500 max-w-xs mx-auto mb-6">
          {t("dashboard.noReportsDesc")}
        </p>
        <Link href="/upload">
          <Button>{t("dashboard.uploadFirst")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && <Alert variant="error">{error}</Alert>}
      {docs.map((doc) => {
        const Icon = getFileIcon(doc.file_type);
        const label = translateUploadStatus(t, doc.upload_status);
        const isGenerating = generatingId === doc.id;

        return (
          <div
            key={doc.id}
            className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            {/* Top row: icon + info + badge */}
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-gray-100 p-2.5 flex-shrink-0">
                <Icon className="h-5 w-5 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {doc.original_filename}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatBytes(doc.file_size)} &middot;{" "}
                  {formatDate(doc.created_at)}
                  {doc.family_member ? (
                    <>
                      {" "}
                      &middot; {t("dashboard.reportFor")}:{" "}
                      {doc.family_member.relation === "self"
                        ? t("dashboard.myself")
                        : `${doc.family_member.relation.charAt(0).toUpperCase() + doc.family_member.relation.slice(1)} - ${doc.family_member.fullName}`}
                    </>
                  ) : (
                    <> &middot; {t("dashboard.reportFor")}: {t("dashboard.myself")}</>
                  )}
                </p>
                {doc.error_message && (
                  <p className="text-xs text-red-500 mt-1 line-clamp-2">
                    {sanitizeDocumentErrorMessage(doc.error_message)}
                  </p>
                )}
              </div>
              <Badge variant={statusBadgeVariant(doc.upload_status)}>
                {doc.upload_status === "processing" && (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                )}
                {label}
              </Badge>
            </div>

            {/* Action row */}
            <div className="flex flex-wrap items-center gap-2 mt-3 pl-[52px]">
              {doc.upload_status === "ai_completed" && doc.report_id ? (
                <>
                  <Link href={`/reports/${doc.report_id}`}>
                    <Button variant="primary" size="sm">
                      <Sparkles className="h-3.5 w-3.5" />
                      {t("dashboard.viewSummary")}
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    loading={downloadingId === doc.report_id}
                    onClick={async () => {
                      setDownloadingId(doc.report_id);
                      try {
                        await api.downloadReportPdf(doc.report_id!);
                      } catch (err: any) {
                        setError(err.message || "PDF download failed");
                      } finally {
                        setDownloadingId(null);
                      }
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                    {t("dashboard.pdf")}
                  </Button>
                </>
              ) : doc.upload_status === "text_extracted" ? (
                <Button
                  variant="primary"
                  size="sm"
                  loading={isGenerating}
                  onClick={() => handleGenerate(doc.id)}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {isGenerating ? t("dashboard.generating") : t("dashboard.generateSummary")}
                </Button>
              ) : doc.upload_status === "uploaded" ? (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t("dashboard.awaitingExtraction")}
                </span>
              ) : doc.upload_status === "processing" ? (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t("dashboard.extractingText")}
                </span>
              ) : doc.upload_status === "failed" ? (
                <Button
                  variant="outline"
                  size="sm"
                  loading={retryingId === doc.id}
                  onClick={async () => {
                    setRetryingId(doc.id);
                    setError("");
                    try {
                      const data = await api.post<DocumentItem>(
                        `/api/documents/${doc.id}/extract-text`,
                        {}
                      );
                      setDocs((prev) =>
                        prev.map((d) =>
                          d.id === doc.id
                            ? {
                                ...d,
                                upload_status: data.upload_status,
                                error_message: data.error_message,
                              }
                            : d
                        )
                      );
                    } catch (err: any) {
                      setError(err.message || "Retry failed");
                    } finally {
                      setRetryingId(null);
                    }
                  }}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {retryingId === doc.id ? t("dashboard.retrying") : t("dashboard.retry")}
                </Button>
              ) : null}

              {(doc.upload_status === "text_extracted" ||
                doc.upload_status === "ai_completed") && (
                <Link href={`/documents/${doc.id}`}>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-3.5 w-3.5" />
                    {t("dashboard.text")}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
