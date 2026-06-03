"use client";

import { useTranslation } from "@/lib/i18n/use-translation";

export type ChatLanguageChoice = "app" | "en" | "hi";

const OPTIONS: { value: ChatLanguageChoice; labelKey: string }[] = [
  { value: "app", labelKey: "chat.langApp" },
  { value: "en", labelKey: "chat.langEn" },
  { value: "hi", labelKey: "chat.langHi" },
];

export function ChatLanguageSelector(props: {
  value: ChatLanguageChoice;
  onChange: (v: ChatLanguageChoice) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => props.onChange(o.value)}
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors ${
            props.value === o.value
              ? "bg-brand-600 text-white border-brand-600"
              : "bg-white text-gray-600 border-gray-200 hover:border-brand-300"
          }`}
        >
          {t(o.labelKey)}
        </button>
      ))}
    </div>
  );
}
