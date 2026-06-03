"use client";

export type ChatLanguageChoice = "app" | "en" | "hi" | "hinglish";

const OPTIONS: { value: ChatLanguageChoice; label: string }[] = [
  { value: "app", label: "App language" },
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "hinglish", label: "Hinglish" },
];

export function ChatLanguageSelector(props: {
  value: ChatLanguageChoice;
  onChange: (v: ChatLanguageChoice) => void;
}) {
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
          {o.label}
        </button>
      ))}
    </div>
  );
}
