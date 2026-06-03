"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ChatMessageBubble, type ChatBubbleMessage } from "@/components/chat/ChatMessageBubble";
import { SuggestedQuestions } from "@/components/chat/SuggestedQuestions";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatSourceCards } from "@/components/chat/ChatSourceCards";
import type { ChatSource } from "@/components/chat/ChatSourceBadges";
import { ChatSafetyNotice } from "@/components/chat/ChatSafetyNotice";
import { ChatLoadingSteps } from "@/components/chat/ChatLoadingSteps";
import { useTranslation } from "@/lib/i18n/use-translation";
export type ChatAskResult = {
  answer: string;
  reply?: string;
  threadId?: string;
  assistantMessageId?: string;
  sources?: ChatSource[];
  safetyLevel?: "normal" | "caution" | "urgent";
  suggestedQuestions?: string[];
  emergency?: boolean;
};

type AssistantMeta = {
  sources?: ChatSource[];
  safetyLevel?: "normal" | "caution" | "urgent";
  failed?: boolean;
  messageId?: string;
};

function friendlyChatError(e: unknown, t: (key: string) => string, tParams: (key: string, p: Record<string, string>) => string, maxChars: number): string {
  const err = e as Error & { code?: string };
  if (err.code === "RATE_LIMITED" || err.code === "CHAT_RATE_LIMITED") {
    return t("chat.errorRateLimit");
  }
  if (err.code === "CHAT_DAILY_LIMIT_REACHED" || err.code === "CHAT_LIMIT_REACHED") {
    return err.message || t("chat.errorDailyLimit");
  }
  if (err.code === "AI_CHAT_NOT_CONFIGURED" || err.code === "AI_CHAT_FAILED") {
    return t("chat.errorGeneric");
  }
  if (err.message?.includes("Failed to fetch") || err.message?.includes("NetworkError")) {
    return t("chat.errorNetwork");
  }
  return err.message || t("chat.errorGeneric");
}
export function ChatWindow(props: {
  suggestions: string[];
  onSend: (
    message: string,
    options?: { retry?: boolean; retryOfMessageId?: string }
  ) => Promise<ChatAskResult>;
  loadThread?: () => Promise<{ messages: ChatBubbleMessage[] }>;
  subtitle?: string;
  header?: React.ReactNode;
  maxChars?: number;
  onNewChat?: () => void;
}) {
  const { t, tParams } = useTranslation();
  const maxChars = props.maxChars ?? 2000;  const [messages, setMessages] = useState<ChatBubbleMessage[]>([]);
  const [metaByIndex, setMetaByIndex] = useState<Record<number, AssistantMeta>>({});
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>(props.suggestions);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState("");
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [failedAssistantId, setFailedAssistantId] = useState<string | undefined>();
  const [threadId, setThreadId] = useState<string | undefined>();
  const [lastSafety, setLastSafety] = useState<"normal" | "caution" | "urgent">("normal");
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setDynamicSuggestions(props.suggestions);
  }, [props.suggestions]);

  useEffect(() => {
    if (!props.loadThread || loaded) return;
    props
      .loadThread()
      .then((t) => {
        setMessages(
          t.messages.filter((m) => m.role === "user" || m.role === "assistant")
        );
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [props.loadThread, loaded]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, loadingStep]);

  useEffect(() => {
    return () => {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    };
  }, []);

  const startLoadingSteps = () => {
    setLoadingStep(0);
    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    stepTimerRef.current = setInterval(() => {
      setLoadingStep((s) => (s < 2 ? s + 1 : s));
    }, 900);
  };

  const stopLoadingSteps = () => {
    if (stepTimerRef.current) {
      clearInterval(stepTimerRef.current);
      stepTimerRef.current = null;
    }
    setLoadingStep(0);
  };

  const send = useCallback(
    async (text: string, options?: { retry?: boolean }) => {
      const userText = text.trim();
      if (!userText || loading) return;
      if (userText.length > maxChars) {
        setError(tParams("chat.errorMaxLength", { max: String(maxChars) }));
        return;
      }
      setLoading(true);
      setError("");
      setFailedMessage(null);
      startLoadingSteps();

      if (!options?.retry) {
        setMessages((m) => [...m, { role: "user", content: userText }]);
        setInput("");
      }

      const userIdx = options?.retry ? messages.length - 1 : messages.length;

      try {
        const res = await props.onSend(userText, {
          retry: options?.retry,
          retryOfMessageId: options?.retry ? failedAssistantId : undefined,
        });
        const answer = res.answer || res.reply || "";
        const level = res.safetyLevel || (res.emergency ? "urgent" : "normal");
        setLastSafety(level);
        if (res.threadId) setThreadId(res.threadId);
        if (res.suggestedQuestions?.length) {
          setDynamicSuggestions(res.suggestedQuestions);
        }

        if (options?.retry) {
          setMessages((m) => {
            const copy = [...m];
            const last = copy[copy.length - 1];
            if (last?.role === "assistant") copy.pop();
            copy.push({ role: "assistant", content: answer });
            return copy;
          });
          setMetaByIndex((prev) => ({
            ...prev,
            [messages.length - 1]: {
              sources: res.sources,
              safetyLevel: level,
              messageId: res.assistantMessageId,
            },
          }));
        } else {
          setMessages((m) => [...m, { role: "assistant", content: answer }]);
        setMetaByIndex((prev) => ({
          ...prev,
          [userIdx + 1]: {
            sources: res.sources,
            safetyLevel: level,
            messageId: res.assistantMessageId,
          },
        }));
        }
        setFailedAssistantId(undefined);
      } catch (e) {
        const msg = t("chat.errorGeneric");
        setError(friendlyChatError(e, t, tParams, maxChars));        setFailedMessage(userText);
        const failIdx = options?.retry ? messages.length - 1 : userIdx + 1;
        const failContent = msg;
        if (options?.retry) {
          setMessages((m) => {
            const copy = [...m];
            const last = copy[copy.length - 1];
            if (last?.role === "assistant") {
              copy[copy.length - 1] = { role: "assistant", content: failContent };
            } else {
              copy.push({ role: "assistant", content: failContent });
            }
            return copy;
          });
        } else {
          setMessages((m) => [...m, { role: "assistant", content: failContent }]);
        }
        setMetaByIndex((prev) => ({
          ...prev,
          [failIdx]: { failed: true, messageId: failedAssistantId },
        }));
      } finally {
        stopLoadingSteps();
        setLoading(false);
      }
    },
    [loading, messages.length, props, maxChars, failedAssistantId, t, tParams]  );

  const copyLastAssistant = () => {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (last?.content) void navigator.clipboard.writeText(last.content);
  };

  const clearLocal = () => {
    setMessages([]);
    setMetaByIndex({});
    setError("");
    setFailedMessage(null);
    setLastSafety("normal");
    setLoaded(true);
    props.onNewChat?.();
  };

  return (
    <div className="flex flex-col h-[min(78vh,680px)] rounded-2xl border border-gray-100 bg-gray-50 overflow-hidden">
      {props.header}
      <div className="px-3 pt-3">
        <ChatSafetyNotice level={lastSafety} />
        {props.subtitle && (
          <p className="text-xs text-gray-500 mb-2">{props.subtitle}</p>
        )}
        {error && (
          <div className="mb-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700">
            {error}
            {failedMessage && (
              <Button
                variant="outline"
                type="button"
                size="sm"
                className="mt-2 w-full"
                disabled={loading}
                onClick={() => send(failedMessage, { retry: true })}
              >
                {t("chat.retry")}
              </Button>            )}
          </div>
        )}
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 space-y-3">
        {messages.length === 0 && !loading && (
          <p className="text-sm text-gray-500 py-4">{t("chat.emptyState")}</p>
        )}        {messages.map((m, i) => (
          <div key={`${m.role}-${i}`}>
            <ChatMessageBubble message={m} />
            {m.role === "assistant" && metaByIndex[i]?.sources && !metaByIndex[i]?.failed && (
              <ChatSourceCards sources={metaByIndex[i].sources!} />
            )}
            {m.role === "assistant" && metaByIndex[i]?.failed && failedMessage && (
              <Button
                variant="outline"
                type="button"
                size="sm"
                className="mt-2"
                disabled={loading}
                onClick={() => send(failedMessage, { retry: true })}
              >
                {t("chat.retry")}
              </Button>            )}
          </div>
        ))}
        {loading && <ChatLoadingSteps activeStep={loadingStep} />}
      </div>
      <div className="px-3 pb-2">
        <SuggestedQuestions
          suggestions={dynamicSuggestions}
          disabled={loading}
          onSelect={send}
        />
        <div className="flex flex-wrap gap-2 mt-2 mb-1">
          {props.onNewChat && (
            <Button variant="ghost" type="button" size="sm" onClick={clearLocal} disabled={loading}>
              {t("chat.newChat")}
            </Button>
          )}
          <Button variant="ghost" type="button" size="sm" onClick={copyLastAssistant} disabled={loading}>
            {t("chat.copyAnswer")}
          </Button>
          <Button variant="ghost" type="button" size="sm" onClick={clearLocal} disabled={loading}>
            {t("chat.clear")}
          </Button>        </div>
      </div>
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={() => send(input)}
        loading={loading}
        maxChars={maxChars}
        placeholder={t("chat.placeholder")}
        sendLabel={t("chat.send")}
      />      {threadId && (
        <p className="sr-only" aria-hidden>
          thread {threadId}
        </p>
      )}
    </div>
  );
}
