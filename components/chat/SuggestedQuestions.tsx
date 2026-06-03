"use client";

export function SuggestedQuestions(props: {
  suggestions: string[];
  disabled?: boolean;
  onSelect: (text: string) => void;
}) {
  if (!props.suggestions.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {props.suggestions.map((s) => (
        <button
          key={s}
          type="button"
          disabled={props.disabled}
          className="text-xs rounded-full border border-gray-200 bg-white px-3 py-1.5 text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-left"
          onClick={() => props.onSelect(s)}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
