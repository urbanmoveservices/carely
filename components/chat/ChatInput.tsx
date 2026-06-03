"use client";

import { Button } from "@/components/ui/Button";

export function ChatInput(props: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  loading?: boolean;
  placeholder?: string;
  maxChars?: number;
}) {
  const max = props.maxChars ?? 2000;
  const remaining = max - props.value.length;
  const over = remaining < 0;

  return (
    <div className="border-t border-gray-100 bg-white p-3 safe-area-pb">
      <div className="flex gap-2 items-end">
        <textarea
          className={`flex-1 min-h-[44px] max-h-32 rounded-xl border px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${
            over ? "border-red-300" : "border-gray-200"
          }`}
          rows={1}
          value={props.value}
          maxLength={max + 50}
          onChange={(e) => props.onChange(e.target.value.slice(0, max))}
          placeholder={props.placeholder ?? "Apna sawal likho…"}
          disabled={props.loading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!over) props.onSend();
            }
          }}
          aria-label="Chat message"
        />
        <Button
          loading={props.loading}
          onClick={props.onSend}
          disabled={over || !props.value.trim()}
          className="shrink-0 min-h-[44px]"
        >
          Send
        </Button>
      </div>
      <p className={`text-[10px] mt-1 text-right ${over ? "text-red-600" : "text-gray-400"}`}>
        {props.value.length}/{max}
      </p>
    </div>
  );
}
