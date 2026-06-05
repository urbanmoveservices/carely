"use client";

import { Suspense, useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { MobileShell } from "@/components/MobileShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { getToken } from "@/lib/auth-client";
import { api } from "@/lib/api-client";
import { formatBytes } from "@/lib/utils";
import type { FamilyMember, UsageSummary } from "@/types";
import {
  Upload,
  FileText,
  Image,
  File,
  X,
  CheckCircle2,
  Sparkles,
  Info,
  UploadCloud,
  Plus,
  ChevronUp,
  ChevronDown,
  Images,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/use-translation";
import { safeErrorMessage } from "@/lib/sanitize-error";

const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".docx"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const MAX_MB =
  parseInt(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB || "10", 10) || 10;

type UploadTab = "single" | "multi";

function getExtension(name: string) {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i).toLowerCase();
}

function fileTypeIcon(name: string) {
  const ext = getExtension(name);
  if (ext === ".pdf") return FileText;
  if (IMAGE_EXTENSIONS.includes(ext)) return Image;
  return File;
}

export default function UploadPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <MobileShell>
            <AppHeader />
            <main className="mx-auto max-w-lg px-4 py-6">
              <div className="h-8 w-48 bg-gray-200 rounded-xl animate-pulse mb-6" />
              <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
            </main>
          </MobileShell>
        }
      >
        <UploadContent />
      </Suspense>
    </ProtectedRoute>
  );
}

function UploadContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const singleInputRef = useRef<HTMLInputElement>(null);
  const multiInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<UploadTab>("single");
  const [file, setFile] = useState<File | null>(null);
  const [multiFiles, setMultiFiles] = useState<File[]>([]);
  const [reportTitle, setReportTitle] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState("");
  const [error, setError] = useState("");
  const [upgradeUrl, setUpgradeUrl] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [docId, setDocId] = useState<string | null>(null);

  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [usage, setUsage] = useState<UsageSummary | null>(null);

  const pageLimit = usage?.maxImagePagesPerReport ?? usage?.usage?.maxImagePagesPerReport ?? 3;
  const planName = usage?.planName ?? "Free";
  const overPageLimit = multiFiles.length > pageLimit;

  useEffect(() => {
    api
      .get<FamilyMember[]>("/api/family-members")
      .then(setFamilyMembers)
      .catch(() => {});
    api
      .getBillingUsage()
      .then(setUsage)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const forParam = searchParams.get("for");
    if (forParam) setSelectedMemberId(forParam);
    if (searchParams.get("mode") === "multi") setTab("multi");
  }, [searchParams]);

  const validateSingleFile = useCallback((f: File): string | null => {
    if (!ALLOWED_EXTENSIONS.includes(getExtension(f.name))) {
      return `Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      return `File too large. Maximum size is ${MAX_MB}MB`;
    }
    return null;
  }, []);

  const validateImageFile = useCallback((f: File): string | null => {
    if (!IMAGE_EXTENSIONS.includes(getExtension(f.name))) {
      return "Only JPG, JPEG, PNG, and WEBP images allowed for multi-page upload";
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      return `Each image must be under ${MAX_MB}MB`;
    }
    return null;
  }, []);

  const handleSelectSingle = useCallback(
    (f: File) => {
      setError("");
      setUpgradeUrl(null);
      setSuccess(false);
      const err = validateSingleFile(f);
      if (err) {
        setError(err);
        return;
      }
      setFile(f);
    },
    [validateSingleFile]
  );

  const addMultiFiles = useCallback(
    (incoming: FileList | File[]) => {
      setError("");
      setUpgradeUrl(null);
      setSuccess(false);
      const list = Array.from(incoming);
      const valid: File[] = [];
      for (const f of list) {
        const err = validateImageFile(f);
        if (err) {
          setError(err);
          return;
        }
        valid.push(f);
      }
      setMultiFiles((prev) => {
        const names = new Set(prev.map((p) => p.name + p.size));
        const merged = [...prev];
        for (const f of valid) {
          if (!names.has(f.name + f.size)) merged.push(f);
        }
        return merged;
      });
    },
    [validateImageFile]
  );

  const movePage = (index: number, dir: -1 | 1) => {
    setMultiFiles((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removePage = (index: number) => {
    setMultiFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const parseUploadError = async (res: Response) => {
    const data = await res.json().catch(() => ({}));
    setUpgradeUrl(typeof data.upgradeUrl === "string" ? data.upgradeUrl : null);
    const code = typeof data.code === "string" ? data.code : undefined;
    throw new Error(
      safeErrorMessage(
        code ? { code, message: data.error } : data.error,
        "Upload failed"
      )
    );
  };

  const handleUpload = async () => {
    setError("");
    setUpgradeUrl(null);
    setUploading(true);

    try {
      const token = getToken();
      if (!token) throw new Error("Not authenticated");

      const formData = new FormData();
      if (selectedMemberId) {
        formData.append("familyMemberId", selectedMemberId);
      }

      if (tab === "multi") {
        if (multiFiles.length === 0) {
          throw new Error("Add at least one image page");
        }
        if (overPageLimit) {
          throw new Error(
            planName === "Free"
              ? "Free plan supports up to 3 image pages per report. Remove extra pages or upgrade."
              : `Your plan supports up to ${pageLimit} images per report.`
          );
        }
        if (reportTitle.trim()) {
          formData.append("title", reportTitle.trim());
        }
        formData.append("uploadMode", "multi_image");
        multiFiles.forEach((f) => formData.append("files", f));
        setUploadPhase(`Uploading ${multiFiles.length} pages…`);
      } else {
        if (!file) return;
        formData.append("file", file);
        formData.append("uploadMode", "single");
        setUploadPhase("Uploading…");
      }

      if (tab === "multi") {
        setUploadPhase("Reading text from pages…");
      } else {
        setUploadPhase("Reading report text…");
      }

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) await parseUploadError(res);

      const data = await res.json();
      if (tab === "multi") {
        setUploadPhase("Combining report text…");
      }

      setSuccess(true);
      setSuccessMessage(
        data.message ||
          (tab === "multi"
            ? "Multi-page report uploaded successfully."
            : "Upload successful!")
      );
      setDocId(data.id || null);
      setFile(null);
      setMultiFiles([]);
      setReportTitle("");
    } catch (err: unknown) {
      setError(safeErrorMessage(err, "Upload failed"));
    } finally {
      setUploading(false);
      setUploadPhase("");
    }
  };

  const Icon = file ? fileTypeIcon(file.name) : UploadCloud;
  const canUploadMulti = multiFiles.length > 0 && !overPageLimit;

  return (
    <MobileShell>
      <AppHeader />
      <main className="mx-auto max-w-lg px-4 py-6 sm:py-10">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
          {t("upload.title")}
        </h1>
        <p className="text-sm text-gray-500 mb-3">
          Upload a file or multiple report photos as one document.
        </p>

        <div className="rounded-xl border border-brand-100 bg-brand-50/80 px-4 py-3 text-xs text-brand-800 space-y-1 mb-4">
          <p className="flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Image reports are read automatically for text extraction.</span>
          </p>
          <p>
            Free plan supports up to <strong>3 image pages</strong> per report.{" "}
            <Link href="/billing" className="underline font-medium">
              Upgrade to Pro
            </Link>{" "}
            for up to <strong>20 image pages</strong>.
          </p>
        </div>

        <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 mb-5">
          <button
            type="button"
            onClick={() => setTab("single")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              tab === "single"
                ? "bg-white text-brand-700 shadow-sm"
                : "text-gray-600"
            }`}
          >
            Single file
          </button>
          <button
            type="button"
            onClick={() => setTab("multi")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
              tab === "multi"
                ? "bg-white text-brand-700 shadow-sm"
                : "text-gray-600"
            }`}
          >
            <Images className="h-4 w-4" />
            Multiple images
          </button>
        </div>

        {error && (
          <div className="mb-5 space-y-2">
            <Alert variant="error">{error}</Alert>
            {upgradeUrl && (
              <Link href={upgradeUrl}>
                <Button variant="outline" size="sm" className="w-full">
                  Upgrade plan
                </Button>
              </Link>
            )}
          </div>
        )}

        {success && (
          <div className="mb-5">
            <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-green-500 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">
                {successMessage}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {t("upload.successNextStep")}
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                {docId && (
                  <Button
                    className="w-full sm:w-auto"
                    onClick={() =>
                      router.push(`/documents/${docId}/generate-summary`)
                    }
                  >
                    <Sparkles className="h-4 w-4" />
                    {t("upload.generateSummary")}
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => router.push("/dashboard")}
                >
                  {t("upload.goDashboard")}
                </Button>
                {docId && (
                  <Link href={`/documents/${docId}`}>
                    <Button variant="ghost" className="w-full sm:w-auto">
                      View Document
                    </Button>
                  </Link>
                )}
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSuccess(false);
                    setDocId(null);
                  }}
                >
                  Upload Another
                </Button>
              </div>
            </div>
          </div>
        )}

        {!success && (
          <>
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm mb-4">
              <Label htmlFor="familyMember" className="mb-1.5 block text-sm font-medium text-gray-700">
                {t("upload.whoFor")}
              </Label>
              <div className="flex gap-2">
                <select
                  id="familyMember"
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm h-11"
                >
                  <option value="">Myself</option>
                  {familyMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.relation})
                    </option>
                  ))}
                </select>
                <Link href="/family/new">
                  <Button variant="outline" size="sm" className="h-11 px-3">
                    <Plus className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {tab === "single" ? (
              <>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleSelectSingle(f);
                  }}
                  onClick={() => !file && singleInputRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors cursor-pointer ${
                    dragActive
                      ? "border-brand-500 bg-brand-50"
                      : file
                        ? "border-brand-300 bg-brand-50/50"
                        : "border-gray-300 bg-white hover:border-brand-400"
                  }`}
                >
                  <input
                    ref={singleInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.docx"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleSelectSingle(f);
                      e.target.value = "";
                    }}
                    className="hidden"
                  />
                  {file ? (
                    <div className="flex flex-col items-center">
                      <div className="rounded-2xl bg-brand-100 p-4 mb-3">
                        <Icon className="h-8 w-8 text-brand-600" />
                      </div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                        className="mt-3 text-xs text-gray-400 hover:text-red-500"
                      >
                        <X className="h-3.5 w-3.5 inline" /> Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="h-8 w-8 text-gray-400 mb-3" />
                      <p className="text-sm font-medium text-gray-700">
                        PDF, DOCX, or single image
                      </p>
                    </>
                  )}
                </div>
                <div className="mt-6">
                  <Button
                    size="lg"
                    onClick={handleUpload}
                    disabled={!file}
                    loading={uploading}
                    className="w-full h-12"
                  >
                    <Upload className="h-5 w-5" />
                    {uploading ? uploadPhase || t("common.loading") : t("upload.uploadBtn")}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 mb-4 text-xs text-blue-800 space-y-1">
                  <p>
                    <strong>{planName} plan:</strong>{" "}
                    {planName === "Free"
                      ? "You can upload up to 3 image pages per report."
                      : `You can upload up to ${pageLimit} image pages per report.`}
                  </p>
                  <p>
                    Multiple images count as <strong>one</strong> monthly upload. Upload
                    pages in correct order.
                  </p>
                  <p className="text-blue-900/80">
                    Image reports are read automatically for better accuracy.
                  </p>
                </div>

                <div className="mb-3">
                  <Label htmlFor="reportTitle">Report title (optional)</Label>
                  <Input
                    id="reportTitle"
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    placeholder="e.g. Blood test March 2026"
                    className="mt-1 h-11"
                  />
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    if (e.dataTransfer.files?.length) {
                      addMultiFiles(e.dataTransfer.files);
                    }
                  }}
                  className={`rounded-2xl border-2 border-dashed p-6 text-center mb-4 ${
                    dragActive ? "border-brand-500 bg-brand-50" : "border-gray-300"
                  }`}
                >
                  <input
                    ref={multiInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    multiple
                    onChange={(e) => {
                      if (e.target.files?.length) addMultiFiles(e.target.files);
                      e.target.value = "";
                    }}
                    className="hidden"
                  />
                  <p className="text-sm text-gray-600 mb-3">
                    Drag and drop report pages, or select multiple images.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => multiInputRef.current?.click()}
                  >
                    Select images
                  </Button>
                </div>

                {overPageLimit && (
                  <div className="mb-4 space-y-2">
                    <Alert variant="warning">
                      {planName === "Free"
                        ? "Free plan supports up to 3 image pages per report. Upgrade to Pro to upload more pages."
                        : `Maximum ${pageLimit} images per report on your plan.`}
                    </Alert>
                    {planName === "Free" && (
                      <Link href="/billing">
                        <Button variant="outline" size="sm" className="w-full">
                          Upgrade plan
                        </Button>
                      </Link>
                    )}
                  </div>
                )}

                {multiFiles.length > 0 && (
                  <ul className="space-y-2 mb-4">
                    {multiFiles.map((f, i) => (
                      <li
                        key={`${f.name}-${i}`}
                        className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white p-3 text-sm"
                      >
                        <span className="font-semibold text-brand-600 w-14">
                          Page {i + 1}
                        </span>
                        <Image className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="flex-1 truncate text-gray-800">{f.name}</span>
                        <span className="text-xs text-gray-400">{formatBytes(f.size)}</span>
                        <button
                          type="button"
                          onClick={() => movePage(i, -1)}
                          disabled={i === 0}
                          className="p-1 text-gray-400 disabled:opacity-30"
                          aria-label="Move up"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => movePage(i, 1)}
                          disabled={i === multiFiles.length - 1}
                          className="p-1 text-gray-400 disabled:opacity-30"
                          aria-label="Move down"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removePage(i)}
                          className="p-1 text-red-400"
                          aria-label="Remove"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex gap-2 mb-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={multiFiles.length === 0}
                    onClick={() => setMultiFiles([])}
                  >
                    Clear all
                  </Button>
                </div>

                <Button
                  size="lg"
                  onClick={handleUpload}
                  disabled={!canUploadMulti}
                  loading={uploading}
                  className="w-full h-12"
                >
                  <Upload className="h-5 w-5" />
                  {uploading
                    ? uploadPhase || "Processing…"
                    : `Upload ${multiFiles.length || ""} page report`.trim()}
                </Button>
              </>
            )}

            <div className="mt-5">
              <div className="flex items-start gap-2 text-xs text-gray-500 rounded-xl bg-gray-50 p-3">
                <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                Image reports are read automatically during upload.
              </div>
            </div>
          </>
        )}
      </main>
    </MobileShell>
  );
}
