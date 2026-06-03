"use client";



import Link from "next/link";

import { ProtectedRoute } from "@/components/ProtectedRoute";

import { AppHeader } from "@/components/AppHeader";

import { MobileShell } from "@/components/MobileShell";

import { ChatShell } from "@/components/chat/ChatShell";

import { usePreferences } from "@/components/PreferencesProvider";



const SUGGESTIONS = [

  "Meri latest report me kya important hai?",

  "Kaunse reports AI summary ke liye pending hain?",

  "Mere active health risks batao.",

  "Upcoming reminders kya hain?",

  "Family me kiski health risk zyada hai?",

];



export default function GlobalChatPage() {

  return (

    <ProtectedRoute>

      <GlobalChatContent />

    </ProtectedRoute>

  );

}



function GlobalChatContent() {

  const prefs = usePreferences();



  return (

    <MobileShell>

      <AppHeader />

      <main className="mx-auto max-w-4xl px-4 py-4 pb-28">

        <Link href="/dashboard" className="text-sm text-brand-600 hover:underline">

          ← Dashboard

        </Link>

        <h1 className="text-2xl font-bold mt-3 mb-1">Vaidya GPT Chat</h1>

        <p className="text-sm text-gray-500 mb-4">

          Apne reports, family health, risks aur reminders ke baare me kuch bhi poochho.

        </p>

        <ChatShell

          mode="general"

          initialLanguage={prefs.language || "app"}

          suggestions={SUGGESTIONS}

          subtitle="Jawab sirf aapke saved health data par based hain."

        />

      </main>

    </MobileShell>

  );

}

