"use client";

import { useRouter } from "next/navigation";
import { Sparkles, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { DocumentItem } from "@/types";

const PENDING_STATUSES = new Set(["text_extracted", "summary_failed"]);

export function PendingSummaryPrompt({ docs }: { docs: DocumentItem[] }) {
  const { t, tParams } = useTranslation();
  const router = useRouter();

  const pending = docs.filter((d) => PENDING_STATUSES.has(d.upload_status));
  if (pending.length === 0) return null;

  const [primary, ...rest] = pending;

  return (
    <div className="rounded-2xl border-2 border-brand-300 bg-gradient-to-br from-brand-50 via-white to-emerald-50/30 p-5 shadow-md mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="rounded-xl bg-brand-600 p-2.5 flex-shrink-0">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900">
              {t("dashboard.pendingSummaryTitle")}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {t("dashboard.pendingSummaryDesc")}
            </p>
            <p className="text-sm font-medium text-gray-900 mt-2 truncate">
              {primary.original_filename}
            </p>
            {rest.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {tParams("dashboard.pendingSummaryMore", {
                  count: String(rest.length),
                })}
              </p>
            )}
          </div>
        </div>
        <Button
          size="lg"
          className="w-full sm:w-auto min-h-[48px] shrink-0"
          onClick={() =>
            router.push(`/documents/${primary.id}/generate-summary`)
          }
        >
          <Sparkles className="h-4 w-4" />
          {primary.upload_status === "summary_failed"
            ? t("dashboard.retry")
            : t("dashboard.generateSummary")}
        </Button>
      </div>

      {rest.length > 0 && (
        <ul className="mt-4 pt-4 border-t border-brand-100 space-y-2">
          {rest.slice(0, 3).map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-sm text-gray-700 truncate">
                  {doc.original_filename}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() =>
                  router.push(`/documents/${doc.id}/generate-summary`)
                }
              >
                {doc.upload_status === "summary_failed"
                  ? t("dashboard.retry")
                  : t("dashboard.generateSummary")}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
