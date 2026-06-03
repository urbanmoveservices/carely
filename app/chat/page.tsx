"use client";

import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppHeader } from "@/components/AppHeader";
import { MobileShell } from "@/components/MobileShell";
import { ChatShell } from "@/components/chat/ChatShell";
import { usePreferences } from "@/components/PreferencesProvider";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getChatSuggestions } from "@/lib/chat/suggested-questions";

export default function GlobalChatPage() {
  return (
    <ProtectedRoute>
      <GlobalChatContent />
    </ProtectedRoute>
  );
}

function GlobalChatContent() {
  const prefs = usePreferences();
  const { t } = useTranslation();

  return (
    <MobileShell>
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-4 pb-28">
        <Link href="/dashboard" className="text-sm text-brand-600 hover:underline">
          ← {t("common.backToDashboard")}
        </Link>
        <h1 className="text-2xl font-bold mt-3 mb-1">{t("chat.pageTitle")}</h1>
        <p className="text-sm text-gray-500 mb-4">{t("chat.pageDesc")}</p>
        <ChatShell
          mode="general"
          initialLanguage={prefs.language || "app"}
          suggestions={getChatSuggestions("general", t)}
          subtitle={t("chat.subtitle")}
        />
      </main>
    </MobileShell>
  );
}
