"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function ChipField({
  label,
  values,
  onChange,
  suggestions = [],
  placeholder = "Add custom…",
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const v = raw.trim();
    if (!v || values.includes(v) || values.length >= 30) return;
    onChange([...values, v]);
    setDraft("");
  };

  const toggle = (chip: string) => {
    if (values.includes(chip)) {
      onChange(values.filter((x) => x !== chip));
    } else {
      add(chip);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-800">{label}</p>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => toggle(chip)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                values.includes(chip)
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-brand-300"
              }`}
            >
              {chip}
            </button>
          ))}
        </div>
      )}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full bg-brand-50 text-brand-800 border border-brand-100 px-2.5 py-0.5 text-xs"
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="hover:text-brand-900"
                aria-label={`Remove ${v}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(draft);
          }
        }}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
      />
    </div>
  );
}

export function OptionGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null | undefined;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-800">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-xl px-3 py-2 text-xs sm:text-sm font-medium border transition-colors min-h-[40px] ${
              value === opt.value
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white text-gray-700 border-gray-200 hover:border-brand-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
