"use client";

export type ChatSource = {
  type: string;
  id: string;
  title: string;
  date?: string;
  href?: string;
};

export function ChatSourceBadges({ sources }: { sources: ChatSource[] }) {
  if (!sources?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {sources.slice(0, 4).map((s) => (
        <span
          key={`${s.type}-${s.id}`}
          className="inline-flex items-center rounded-full bg-brand-50 text-brand-800 px-2.5 py-0.5 text-[11px] font-medium"
        >
          Based on: {s.title}
          {s.date ? ` · ${s.date}` : ""}
        </span>
      ))}
    </div>
  );
}
