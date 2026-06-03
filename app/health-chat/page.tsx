"use client";



import Link from "next/link";

import { ProtectedRoute } from "@/components/ProtectedRoute";

import { AppHeader } from "@/components/AppHeader";

import { MobileShell } from "@/components/MobileShell";

import { ChatShell } from "@/components/chat/ChatShell";

import { api } from "@/lib/api-client";

import { usePreferences } from "@/components/PreferencesProvider";



const SUGGESTIONS = [

  "Mummy ke reports me sugar trend kya hai?",

  "Kiski Vitamin D low hai?",

  "Kaunse reminders pending hain?",

  "Family me highest risk kiska hai?",

  "Kaunsi reports follow-up chahiye?",

];



export default function HealthChatPage() {

  return (

    <ProtectedRoute>

      <HealthChatContent />

    </ProtectedRoute>

  );

}



function HealthChatContent() {

  const prefs = usePreferences();



  return (

    <MobileShell>

      <AppHeader />

      <main className="mx-auto max-w-4xl px-4 py-4 pb-28">

        <Link href="/dashboard" className="text-sm text-brand-600 hover:underline">

          ← Dashboard

        </Link>

        <h1 className="text-2xl font-bold mt-3 mb-1">Family health chat</h1>

        <p className="text-sm text-gray-500 mb-4">

          Poori family ke reports, trends, risks aur reminders par sawal poochho.

        </p>

        <ChatShell

          mode="family"

          initialLanguage={prefs.language || "app"}

          suggestions={SUGGESTIONS}

          subtitle="Family members aur unki saved reports se jawab."

          loadLegacyThread={() =>

            api

              .get<{ thread: { id?: string; messages: { role: string; content: string }[] } }>(

                "/api/health-chat"

              )

              .then((r) => ({

                messages: r.thread.messages,

                threadId: r.thread.id,

              }))

          }

        />

      </main>

    </MobileShell>

  );

}

