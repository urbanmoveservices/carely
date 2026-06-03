"use client";

import { useI18n } from "@/components/I18nProvider";

/**
 * Remounts page content when language changes so client components
 * that cache labels in local state pick up new translations.
 */
export function LanguageReactiveBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const { language, translationVersion } = useI18n();
  return (
    <div
      key={`lang-${language}-${translationVersion}`}
      id="carely-app-content"
      className="contents"
    >
      {children}
    </div>
  );
}
