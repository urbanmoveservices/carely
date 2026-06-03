"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

type Message = { role: string; content: string };

export function ChatPanel(props: {
  title: string;
  suggestions: string[];
  onSend: (message: string) => Promise<{ reply: string; emergency?: boolean }>;
  initialMessages?: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(props.initialMessages ?? []);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [emergency, setEmergency] = useState(false);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setEmergency(false);
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    try {
      const res = await props.onSend(text);
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
      if (res.emergency) setEmergency(true);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Sorry, I could not answer. Please try again or speak with your doctor.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[min(70vh,600px)]">
      <p className="text-xs text-gray-500 mb-3">{props.title}</p>
      {emergency && (
        <Alert variant="error" className="mb-3 text-sm">
          This may be urgent — seek emergency care immediately.
        </Alert>
      )}
      <div className="flex-1 overflow-y-auto space-y-3 rounded-xl border border-gray-100 bg-white p-4 mb-3">
        {messages.length === 0 && (
          <p className="text-sm text-gray-500">Ask a question about your saved health data.</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-sm rounded-lg px-3 py-2 max-w-[90%] ${
              m.role === "user"
                ? "ml-auto bg-brand-50 text-brand-900"
                : "bg-gray-50 text-gray-800"
            }`}
          >
            {m.content}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {props.suggestions.map((s) => (
          <button
            key={s}
            type="button"
            className="text-xs rounded-full border border-gray-200 px-3 py-1 hover:bg-gray-50"
            onClick={() => send(s)}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question…"
          onKeyDown={(e) => e.key === "Enter" && send(input)}
        />
        <Button loading={loading} onClick={() => send(input)}>
          Send
        </Button>
        <Button variant="ghost" onClick={() => setMessages([])}>
          Clear
        </Button>
      </div>
    </div>
  );
}
