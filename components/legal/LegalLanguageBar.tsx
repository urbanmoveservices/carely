"use client";

import { LanguageSelector } from "@/components/LanguageSelector";
import { useTranslation } from "@/lib/i18n/use-translation";

export function LegalLanguageBar() {
  const { t } = useTranslation();
  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <LanguageSelector compact />
      <p className="text-xs text-gray-600">{t("legal.translationNote")}</p>
    </div>
  );
}
