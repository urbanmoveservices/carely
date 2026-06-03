"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { MobileShell } from "@/components/MobileShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Skeleton";
import { STATUS_LABELS } from "@/lib/constants";
import { api } from "@/lib/api-client";
import { formatBytes, formatDate } from "@/lib/utils";
import { formatAiSummaryClientError } from "@/lib/summary-error-messages";
import type {
  DocumentDetail,
  DocumentText,
} from "@/types";
import {
  ArrowLeft,
  FileText,
  ScanText,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  ImageIcon,
  CheckCircle2,
  Upload,
} from "lucide-react";

const POLL_INTERVAL = 3000;
const POLL_STATUSES = new Set(["uploaded", "processing"]);

export default function DocumentDetailPage() {
  return (
    <ProtectedRoute>
      <DocumentDetailContent />
    </ProtectedRoute>
  );
}

function DocumentDetailContent() {
  const params = useParams();
  const router = useRouter();
  const docId = params.id as string;

  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [fullText, setFullText] = useState<string | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [loadingText, setLoadingText] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const isDev = process.env.NODE_ENV !== "production";
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDoc = useCallback(async () => {
    try {
      const data = await api.get<DocumentDetail>(`/api/documents/${docId}`);
      setDoc(data);
      if (!POLL_STATUSES.has(data.upload_status) && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingDoc(false);
    }
  }, [docId]);

  useEffect(() => {
    fetchDoc();
  }, [fetchDoc]);

  useEffect(() => {
    if (doc && POLL_STATUSES.has(doc.upload_status)) {
      pollRef.current = setInterval(fetchDoc, POLL_INTERVAL);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [doc?.upload_status, fetchDoc]);

  const loadFullText = async () => {
    setLoadingText(true);
    try {
      const data = await api.get<DocumentText>(
        `/api/documents/${docId}/text`
      );
      setFullText(data.extracted_text);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingText(false);
    }
  };

  useEffect(() => {
    if (
      doc &&
      (doc.upload_status === "text_extracted" ||
        doc.upload_status === "ai_completed") &&
      !fullText
    ) {
      loadFullText();
    }
  }, [doc?.upload_status]);

  const handleCopy = async () => {
    if (!fullText) return;
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loadingDoc) {
    return (
      <MobileShell>
        <AppHeader />
        <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
          <Skeleton className="h-6 w-32 mb-4 rounded-xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </main>
      </MobileShell>
    );
  }

  if (error && !doc) {
    return (
      <MobileShell>
        <AppHeader />
        <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
          <Alert variant="error">{error}</Alert>
          <div className="mt-4">
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </main>
      </MobileShell>
    );
  }

  if (!doc) return null;

  const label = STATUS_LABELS[doc.upload_status] || doc.upload_status;
  const badgeVariant = doc.upload_status as any;

  const statusSteps = [
    {
      key: "uploaded",
      label: "Uploaded",
      done:
        doc.upload_status !== "uploaded" && doc.upload_status !== "processing",
      active:
        doc.upload_status === "uploaded" || doc.upload_status === "processing",
    },
    {
      key: "text_extracted",
      label: "Text Extracted",
      done:
        doc.upload_status === "text_extracted" ||
        doc.upload_status === "ai_completed",
      active: false,
    },
    {
      key: "ai_completed",
      label: "AI Summary",
      done: doc.upload_status === "ai_completed",
      active: false,
    },
  ];

  return (
    <MobileShell>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        {/* Document summary card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm mb-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                {doc.original_filename}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                {formatBytes(doc.file_size)} &middot; {doc.file_type} &middot;{" "}
                {formatDate(doc.created_at)}
                {doc.upload_mode === "multi_image" && doc.page_count
                  ? ` · ${doc.page_count} pages`
                  : ""}
              </p>
              {doc.upload_mode === "multi_image" && (
                <p className="text-xs text-brand-600 mt-1">
                  Multi-page image report · OCR: OpenAI Vision
                  {(doc.failed_page_count ?? 0) > 0
                    ? ` · ${doc.failed_page_count} page(s) failed OCR`
                    : ""}
                </p>
              )}
              {doc.file_type.startsWith("image/") && doc.upload_mode !== "multi_image" && (
                <p className="text-xs text-gray-500 mt-1">OCR: OpenAI Vision</p>
              )}
              {doc.family_member && (
                <p className="text-xs text-brand-600 mt-1 font-medium">
                  Report for: {doc.family_member.fullName} ({doc.family_member.relation})
                </p>
              )}
            </div>
            <Badge variant={badgeVariant}>{label}</Badge>
          </div>

          {/* Status timeline */}
          <div className="flex items-center gap-0">
            {statusSteps.map((step, i) => (
              <div key={step.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      step.done
                        ? "bg-green-500 text-white"
                        : step.active
                        ? "bg-brand-500 text-white"
                        : doc.upload_status === "failed"
                        ? "bg-red-100 text-red-400"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {step.done ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : step.active ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 text-center leading-tight">
                    {step.label}
                  </span>
                </div>
                {i < statusSteps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 mt-[-14px] ${
                      step.done ? "bg-green-300" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Processing state */}
        {(doc.upload_status === "uploaded" ||
          doc.upload_status === "processing") && (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center">
            <Loader2 className="mx-auto h-10 w-10 text-brand-600 animate-spin mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {doc.upload_status === "uploaded"
                ? "Preparing to extract text..."
                : "Extracting text from your document..."}
            </h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              This page will update automatically.
            </p>
          </div>
        )}

        {doc.upload_mode === "multi_image" && doc.pages && doc.pages.length > 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm mb-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-brand-600" />
              Report pages ({doc.page_count})
            </h2>
            <ul className="space-y-2">
              {doc.pages.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between text-sm rounded-lg border border-gray-100 px-3 py-2"
                >
                  <span className="min-w-0 truncate">
                    Page {p.page_number}: {p.original_filename}
                    {p.ocr_provider === "openai" && (
                      <span className="text-gray-400 ml-1">· OpenAI</span>
                    )}
                  </span>
                  <Badge
                    variant={
                      p.ocr_status === "completed"
                        ? "completed"
                        : p.ocr_status === "failed"
                          ? "critical"
                          : "default"
                    }
                  >
                    {p.ocr_status}
                  </Badge>
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              loading={retrying}
              onClick={async () => {
                setRetrying(true);
                setError("");
                try {
                  const data = await api.post<DocumentDetail>(
                    `/api/documents/${docId}/rerun-ocr`,
                    { onlyFailed: true }
                  );
                  setDoc(data);
                  setFullText(null);
                  loadFullText();
                } catch (err: unknown) {
                  setError(err instanceof Error ? err.message : "OCR retry failed");
                } finally {
                  setRetrying(false);
                }
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Re-run OCR (failed pages)
            </Button>
          </div>
        )}

        {/* Failed state */}
        {doc.upload_status === "failed" && (
          <div className="rounded-2xl border border-red-100 bg-red-50/50 p-6 sm:p-8 text-center">
            <div className="rounded-full bg-red-100 p-4 w-fit mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Text extraction failed
            </h3>
            {doc.error_message && (
              <p className="text-sm text-red-600 max-w-sm mx-auto mb-5">
                {doc.error_message}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-2 justify-center mb-5">
              <Button
                variant="primary"
                loading={retrying}
                onClick={async () => {
                  setRetrying(true);
                  setError("");
                  try {
                    const endpoint =
                      doc.upload_mode === "multi_image"
                        ? `/api/documents/${docId}/rerun-ocr`
                        : `/api/documents/${docId}/extract-text`;
                    const data = await api.post<DocumentDetail>(endpoint, {});
                    setDoc(data);
                    if (data.upload_status === "text_extracted") {
                      setFullText(null);
                      loadFullText();
                    }
                  } catch (err: any) {
                    setError(err.message || "Retry failed");
                  } finally {
                    setRetrying(false);
                  }
                }}
              >
                <RefreshCw className="h-4 w-4" />
                {retrying ? "Retrying..." : "Try Again"}
              </Button>
              <Link href="/upload">
                <Button variant="outline" className="w-full sm:w-auto">
                  Upload a different file
                </Button>
              </Link>
            </div>

            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 max-w-sm mx-auto">
              <div className="flex items-start gap-2">
                <ImageIcon className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700 text-left">
                  <strong>Tip:</strong> If this is a scanned PDF, try uploading
                  as a JPG or PNG image for OCR extraction.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Text extracted / AI completed */}
        {(doc.upload_status === "text_extracted" ||
          doc.upload_status === "ai_completed") && (
          <>
            {/* Extracted text card */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm mb-5 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <ScanText className="h-4 w-4 text-brand-600" />
                  <span className="text-sm font-semibold text-gray-900">
                    Extracted Text
                  </span>
                  <span className="text-xs text-gray-400">
                    {doc.extracted_text_length.toLocaleString()} chars
                  </span>
                </div>
                {fullText && (
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-green-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </Button>
                )}
              </div>
              <div className="px-5 py-4">
                {loadingText ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ) : fullText ? (
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed max-h-[500px] overflow-y-auto">
                    {fullText}
                  </pre>
                ) : (
                  <p className="text-sm text-gray-500">
                    {doc.extracted_text_preview || "No text available"}
                  </p>
                )}
              </div>
            </div>

            {/* Generate summary CTA */}
            {doc.upload_status === "text_extracted" && (
              <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-6 sm:p-8 text-center">
                <div className="rounded-full bg-brand-100 p-4 w-fit mx-auto mb-3">
                  <Sparkles className="h-8 w-8 text-brand-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Text extracted successfully
                </h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto mb-5">
                  Generate an AI-powered summary with key findings,
                  recommendations, and health insights.
                </p>
                <Link href={`/documents/${docId}/generate-summary`}>
                  <Button size="lg" className="h-12 w-full sm:w-auto">
                    <Sparkles className="h-5 w-5" />
                    Generate AI Summary
                  </Button>
                </Link>
              </div>
            )}

            {isDev && (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 mb-5 text-xs text-gray-600">
                <p className="font-semibold text-gray-700 mb-1">Dev: extracted text</p>
                <p>Length: {doc.extracted_text_length.toLocaleString()} chars</p>
                <pre className="mt-2 whitespace-pre-wrap max-h-32 overflow-y-auto text-gray-500">
                  {(fullText || doc.extracted_text_preview || "").slice(0, 300)}
                  {(fullText || doc.extracted_text_preview || "").length > 300
                    ? "…"
                    : ""}
                </pre>
              </div>
            )}

            {/* View summary link */}
            {doc.upload_status === "ai_completed" && doc.report_id && (
              <div className="rounded-2xl border border-green-100 bg-green-50/50 p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:justify-between">
                  <div className="flex items-center gap-3 text-center sm:text-left">
                    <CheckCircle2 className="h-8 w-8 text-green-500 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        AI Summary Ready
                      </h3>
                      <p className="text-sm text-gray-500">
                        View findings and recommendations
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Link href={`/reports/${doc.report_id}`}>
                      <Button className="w-full sm:w-auto">
                        <Sparkles className="h-4 w-4" />
                        View AI Summary
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      loading={regenerating}
                      onClick={async () => {
                        const ok = window.confirm(
                          "This will replace the current AI summary with a new one based on the extracted text."
                        );
                        if (!ok) return;
                        setRegenerating(true);
                        setError("");
                        try {
                          const res = await api.regenerateDocumentSummary(docId);
                          router.push(`/reports/${res.report_id}`);
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
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </MobileShell>
  );
}
