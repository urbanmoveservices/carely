"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "@/lib/i18n/use-translation";
import { Label } from "@/components/ui/Label";
import type { SupportedLanguageCode } from "@/lib/i18n/languages";
import { cn } from "@/lib/utils";

type LanguageSelectorProps = {
  className?: string;
  compact?: boolean;
  showLabel?: boolean;
};

export function LanguageSelector({
  className,
  compact = false,
  showLabel = true,
}: LanguageSelectorProps) {
  const { language, setLanguage, supportedLanguages, t, dir } = useTranslation();
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return supportedLanguages;
    return supportedLanguages.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.includes(q)
    );
  }, [filter, supportedLanguages]);

  const handleChange = (next: string) => {
    const code = next as SupportedLanguageCode;
    if (code === language) return;
    void setLanguage(code);
  };

  return (
    <div
      className={cn("space-y-2", className)}
      dir={dir}
      data-carely-no-translate
    >
      {showLabel && (
        <Label htmlFor="carely-language-select">
          {t("common.languageLabel")} / भाषा
        </Label>
      )}
      {!compact && (
        <input
          type="search"
          placeholder={t("common.search")}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm min-h-[40px]"
          aria-label="Filter languages"
        />
      )}
      <select
        id="carely-language-select"
        value={language}
        onChange={(e) => handleChange(e.target.value)}
        className={cn(
          "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm min-h-[44px]",
          compact && "text-sm"
        )}
      >
        {filtered.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeName}
          </option>
        ))}
      </select>
    </div>
  );
}
