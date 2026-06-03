"use client";

import Link from "next/link";
import type { ChatSource } from "@/components/chat/ChatSourceBadges";
import { hrefForChatSource } from "@/components/chat/chat-source-links";

export function ChatSourceCards({ sources }: { sources: ChatSource[] }) {
  if (!sources?.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {sources.slice(0, 4).map((s) => {
        const href = s.href || hrefForChatSource(s);
        const label = (
          <>
            <span className="font-medium">{s.title}</span>
            {s.date ? <span className="text-gray-500"> · {s.date}</span> : null}
          </>
        );
        const className =
          "block rounded-xl border border-brand-100 bg-white px-3 py-2 text-[11px] text-brand-900 shadow-sm hover:border-brand-300 transition-colors min-w-[140px] max-w-[220px]";
        if (href) {
          return (
            <Link key={`${s.type}-${s.id}`} href={href} className={className}>
              <span className="text-[10px] uppercase tracking-wide text-brand-600 block mb-0.5">
                {sourceTypeLabel(s.type)}
              </span>
              {label}
            </Link>
          );
        }
        return (
          <div key={`${s.type}-${s.id}`} className={className}>
            <span className="text-[10px] uppercase tracking-wide text-brand-600 block mb-0.5">
              {sourceTypeLabel(s.type)}
            </span>
            {label}
          </div>
        );
      })}
    </div>
  );
}

function sourceTypeLabel(type: string): string {
  if (type === "report" || type === "document") return "Report";
  if (type === "family" || type === "familyMember") return "Family";
  if (type === "risk" || type === "healthRisk") return "Health risk";
  if (type === "reminder") return "Reminder";
  if (type === "labTrend") return "Lab trend";
  if (type === "appointment") return "Appointment";
  return "Source";
}
