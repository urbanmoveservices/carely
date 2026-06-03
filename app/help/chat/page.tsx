"use client";

import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppHeader } from "@/components/AppHeader";
import { MobileShell } from "@/components/MobileShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { api } from "@/lib/api-client";
import { usePreferences } from "@/components/PreferencesProvider";

const SUGGESTIONS = [
  "How do I upload a report?",
  "How does multi-image upload work?",
  "How do I upgrade with Razorpay?",
  "How do I reset my password?",
  "How do I update my profile and phone number?",
  "How do I add a family member?",
];

export default function HelpChatPage() {
  return (
    <ProtectedRoute>
      <HelpChatContent />
    </ProtectedRoute>
  );
}

function HelpChatContent() {
  const { language } = usePreferences();

  return (
    <MobileShell hideBottomNav>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-6 pb-24">
        <Link href="/help" className="text-sm text-brand-600 hover:underline">
          ← Help
        </Link>
        <h1 className="text-2xl font-bold mt-4 mb-2">Support chat</h1>
        <p className="text-sm text-gray-500 mb-6">
          App usage and billing help only. For medical questions, use Report Chat or Family Health
          Chat.
        </p>
        <Card>
          <CardHeader>
            <CardTitle>Ask Vaidya GPT</CardTitle>
          </CardHeader>
          <CardContent>
            <ChatWindow
              suggestions={SUGGESTIONS}
              subtitle="Upload, billing, profile, family, language, and support tickets."
              loadThread={() =>
                api
                  .get<{ thread: { messages: { role: string; content: string }[] } }>(
                    "/api/support/chat"
                  )
                  .then((r) => ({ messages: r.thread.messages }))
              }
              onSend={async (message) => {
                const res = await api.post<{ reply: string; emergency?: boolean }>(
                  "/api/support/chat",
                  { message, language }
                );
                return {
                  answer: res.reply,
                  reply: res.reply,
                  emergency: res.emergency,
                  safetyLevel: res.emergency ? "urgent" : "normal",
                };
              }}
            />
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-sm text-gray-500">
          Need a human?{" "}
          <Link href="/help/tickets/new" className="text-brand-600 underline">
            Open a support ticket
          </Link>
        </p>
      </main>
    </MobileShell>
  );
}
