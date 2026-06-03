"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { groupThreadsByDate } from "@/lib/chat/thread-groups";
import type { ChatThreadListItem } from "@/types";
import type { ChatAskMode } from "@/types";

function typeBadge(type: string) {
  if (type === "report") return "Report";
  if (type === "family") return "Family";
  return "General";
}

export function ChatHistorySidebar(props: {
  threads: ChatThreadListItem[];
  activeThreadId?: string;
  mode: ChatAskMode;
  reportId?: string;
  loading?: boolean;
  onSelect: (threadId: string) => void;
  onNewChat: () => void;
  onDeleteRequest: (thread: ChatThreadListItem) => void;
  className?: string;
}) {
  const filtered = props.threads.filter((t) => {
    if (props.mode === "report" && props.reportId) {
      return t.type === "report" && t.reportId === props.reportId;
    }
    if (props.mode === "family") return t.type === "family";
    return t.type === "general";
  });

  const groups = groupThreadsByDate(filtered);

  return (
    <aside
      className={`flex flex-col border border-gray-100 rounded-2xl bg-white overflow-hidden max-h-[min(78vh,680px)] ${props.className ?? "w-full md:w-56 shrink-0"}`}
    >
      <div className="p-3 border-b border-gray-100 flex flex-col gap-2">
        <Button type="button" size="sm" className="w-full" onClick={props.onNewChat}>
          New chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {props.loading && (
          <p className="text-xs text-gray-400 px-2 py-3">Loading…</p>
        )}
        {!props.loading && filtered.length === 0 && (
          <p className="text-xs text-gray-400 px-2 py-3">No chats yet</p>
        )}
        {groups.map((g) => (
          <div key={g.group} className="mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 px-2 mb-1">
              {g.label}
            </p>
            <ul className="space-y-1">
              {g.threads.map((t) => {
                const active = t.id === props.activeThreadId;
                const preview =
                  t.lastMessagePreview ||
                  t.lastMessage ||
                  t.reportFilename ||
                  t.title ||
                  "Chat";
                return (
                  <li key={t.id}>
                    <div
                      className={`group rounded-xl border px-2 py-2 ${
                        active
                          ? "border-brand-300 bg-brand-50"
                          : "border-transparent hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start gap-1">
                        <button
                          type="button"
                          className="flex-1 min-w-0 text-left"
                          onClick={() => props.onSelect(t.id)}
                        >
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className="text-[9px] font-medium uppercase px-1 py-0.5 rounded bg-gray-100 text-gray-600">
                              {typeBadge(t.type)}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {formatTime(t.updatedAt)}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-gray-900 line-clamp-2">
                            {t.title || preview}
                          </p>
                          {t.title && (
                            <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">
                              {preview}
                            </p>
                          )}
                        </button>
                        <button
                          type="button"
                          className="p-1 text-gray-400 hover:text-red-600 shrink-0"
                          onClick={() => props.onDeleteRequest(t)}
                          aria-label="Delete chat"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
