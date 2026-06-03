"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppHeader } from "@/components/AppHeader";
import { MobileShell } from "@/components/MobileShell";
import { ChatShell } from "@/components/chat/ChatShell";
import { api } from "@/lib/api-client";
import { usePreferences } from "@/components/PreferencesProvider";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getChatSuggestions } from "@/lib/chat/suggested-questions";
import type { ReportDetail } from "@/types";

export default function ReportChatPage() {
  return (
    <ProtectedRoute>
      <ReportChat />
    </ProtectedRoute>
  );
}

function ReportChat() {
  const params = useParams();
  const reportId = params.id as string;
  const prefs = usePreferences();
  const { t, tParams } = useTranslation();
  const [report, setReport] = useState<ReportDetail | null>(null);

  useEffect(() => {
    api.get<ReportDetail>(`/api/reports/${reportId}`).then(setReport).catch(() => {});
  }, [reportId]);

  return (
    <MobileShell hideBottomNav>
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-4 pb-24">
        <Link href={`/reports/${reportId}`} className="text-sm text-brand-600 hover:underline">
          ← {t("report.title")}
        </Link>
        <h1 className="text-2xl font-bold mt-3 mb-1">{t("chat.reportTitle")}</h1>
        {report && (
          <p className="text-sm text-gray-600 mb-3">
            {report.document?.originalFilename || t("report.title")} ·{" "}
            {report.healthScore != null
              ? tParams("chat.reportScore", { score: String(report.healthScore) })
              : t("chat.reportSummary")}
          </p>
        )}
        <ChatShell
          mode="report"
          reportId={reportId}
          initialLanguage={prefs.language || "app"}
          suggestions={getChatSuggestions("report", t)}
          subtitle={t("chat.reportSubtitle")}
          loadLegacyThread={() =>
            api
              .get<{ thread: { id?: string; messages: { role: string; content: string }[] } }>(
                `/api/reports/${reportId}/chat`
              )
              .then((r) => ({
                messages: r.thread.messages,
                threadId: r.thread.id,
              }))
          }
        />
      </main>
    </MobileShell>
  );
}
