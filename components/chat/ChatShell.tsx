"use client";

import { useCallback, useEffect, useState } from "react";
import { History, X } from "lucide-react";
import { ChatWindow, type ChatAskResult } from "@/components/chat/ChatWindow";
import { ChatHistorySidebar } from "@/components/chat/ChatHistorySidebar";
import {
  ChatLanguageSelector,
  type ChatLanguageChoice,
} from "@/components/chat/ChatLanguageSelector";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api-client";
import type { ChatAskMode, ChatThreadListItem } from "@/types";
import type { ChatBubbleMessage } from "@/components/chat/ChatMessageBubble";

const MAX_MESSAGE_CHARS = 2000;

export function ChatShell(props: {
  mode: ChatAskMode;
  reportId?: string;
  familyMemberId?: string;
  initialLanguage?: string;
  suggestions: string[];
  subtitle?: string;
  header?: React.ReactNode;
  loadLegacyThread?: () => Promise<{ messages: ChatBubbleMessage[]; threadId?: string }>;
  showHistory?: boolean;
}) {
  const [threads, setThreads] = useState<ChatThreadListItem[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [threadId, setThreadId] = useState<string | undefined>();
  const [pendingNewThread, setPendingNewThread] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<ChatThreadListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [language, setLanguage] = useState<ChatLanguageChoice>(
    (props.initialLanguage as ChatLanguageChoice) || "app"
  );

  const refreshThreads = useCallback(() => {
    if (props.showHistory === false) return;
    setThreadsLoading(true);
    api
      .getChatThreads({
        type: props.mode,
        reportId: props.reportId,
        familyMemberId: props.familyMemberId,
      })
      .then((r) => setThreads(r.threads))
      .catch(() => setThreads([]))
      .finally(() => setThreadsLoading(false));
  }, [props.showHistory, props.mode, props.reportId, props.familyMemberId]);

  useEffect(() => {
    refreshThreads();
  }, [refreshThreads, reloadKey]);

  const loadThread = useCallback(async () => {
    if (threadId) {
      const r = await api.getChatThread(threadId);
      return {
        messages: r.thread.messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
            id: m.id,
            failed: (m.metadata as { status?: string } | null)?.status === "failed",
          })) as ChatBubbleMessage[],
      };
    }
    if (props.loadLegacyThread) {
      const legacy = await props.loadLegacyThread();
      if (legacy.threadId) setThreadId(legacy.threadId);
      return { messages: legacy.messages };
    }
    return { messages: [] as ChatBubbleMessage[] };
  }, [threadId, props.loadLegacyThread]);

  const onSend = useCallback(
    async (
      message: string,
      options?: { retry?: boolean; retryOfMessageId?: string }
    ): Promise<ChatAskResult> => {
      const res = await api.chatAsk({
        message,
        mode: props.mode,
        reportId: props.reportId,
        familyMemberId: props.familyMemberId,
        threadId: pendingNewThread && !options?.retry ? undefined : threadId,
        newThread: options?.retry ? false : pendingNewThread || undefined,
        retry: options?.retry,
        retryOfMessageId: options?.retryOfMessageId,
        language,
      });
      setPendingNewThread(false);
      if (res.threadId) setThreadId(res.threadId);
      setReloadKey((k) => k + 1);
      return res;
    },
    [
      props.mode,
      props.reportId,
      props.familyMemberId,
      language,
      threadId,
      pendingNewThread,
    ]
  );

  const handleNewChat = () => {
    setThreadId(undefined);
    setPendingNewThread(true);
    setReloadKey((k) => k + 1);
    setHistoryOpen(false);
  };

  const handleSelectThread = (id: string) => {
    setPendingNewThread(false);
    setThreadId(id);
    setReloadKey((k) => k + 1);
    setHistoryOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteChatThread(deleteTarget.id);
      if (threadId === deleteTarget.id) {
        setThreadId(undefined);
        setPendingNewThread(true);
        setReloadKey((k) => k + 1);
      }
      refreshThreads();
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const showSidebar = props.showHistory !== false;

  const sidebar = showSidebar ? (
    <ChatHistorySidebar
      threads={threads}
      activeThreadId={threadId}
      mode={props.mode}
      reportId={props.reportId}
      loading={threadsLoading}
      onSelect={handleSelectThread}
      onNewChat={handleNewChat}
      onDeleteRequest={setDeleteTarget}
      className="hidden md:flex"
    />
  ) : null;

  return (
    <div className="flex flex-col gap-2">
      <ChatLanguageSelector value={language} onChange={setLanguage} />
      <div className="flex flex-col md:flex-row gap-3">
        {sidebar}
        <div className="flex-1 min-w-0">
          {showSidebar && (
            <div className="md:hidden flex justify-end mb-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setHistoryOpen(true)}
              >
                <History className="h-4 w-4 mr-1" />
                History
              </Button>
            </div>
          )}
          <ChatWindow
            key={`${threadId ?? "new"}-${reloadKey}`}
            suggestions={props.suggestions}
            subtitle={props.subtitle}
            header={props.header}
            maxChars={MAX_MESSAGE_CHARS}
            loadThread={loadThread}
            onSend={onSend}
            onNewChat={showSidebar ? handleNewChat : undefined}
          />
        </div>
      </div>

      {historyOpen && showSidebar && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setHistoryOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-[min(100%,280px)] bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-semibold text-sm">Chat history</span>
              <button type="button" onClick={() => setHistoryOpen(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <ChatHistorySidebar
              threads={threads}
              activeThreadId={threadId}
              mode={props.mode}
              reportId={props.reportId}
              loading={threadsLoading}
              onSelect={handleSelectThread}
              onNewChat={handleNewChat}
              onDeleteRequest={setDeleteTarget}
              className="flex-1 border-0 rounded-none max-h-none"
            />
          </div>
        </div>
      )}

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Delete this chat history?"
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={confirmDelete}
        loading={deleting}
      >
        This conversation will be permanently removed. You cannot undo this.
      </Modal>
    </div>
  );
}
