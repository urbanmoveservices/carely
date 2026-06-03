"use client";



import { useEffect, useState } from "react";

import { useParams } from "next/navigation";

import Link from "next/link";

import { ProtectedRoute } from "@/components/ProtectedRoute";

import { AppHeader } from "@/components/AppHeader";

import { MobileShell } from "@/components/MobileShell";

import { ChatShell } from "@/components/chat/ChatShell";

import { api } from "@/lib/api-client";

import { usePreferences } from "@/components/PreferencesProvider";

import type { ReportDetail } from "@/types";



const SUGGESTIONS = [

  "Is report me sabse important kya hai?",

  "Kaunse values high/low hain?",

  "Doctor se kya poochna chahiye?",

  "Simple Hindi me explain karo.",

  "Kya mujhe urgent doctor ko dikhana chahiye?",

];



export default function ReportChatPage() {

  return (

    <ProtectedRoute>

      <ReportChat />

    </ProtectedRoute>

  );

}



function ReportChat() {

  const params = useParams();

  const reportId = params.id as string;

  const prefs = usePreferences();

  const [report, setReport] = useState<ReportDetail | null>(null);



  useEffect(() => {

    api.get<ReportDetail>(`/api/reports/${reportId}`).then(setReport).catch(() => {});

  }, [reportId]);



  return (

    <MobileShell hideBottomNav>

      <AppHeader />

      <main className="mx-auto max-w-4xl px-4 py-4 pb-24">

        <Link href={`/reports/${reportId}`} className="text-sm text-brand-600 hover:underline">

          ← Report

        </Link>

        <h1 className="text-2xl font-bold mt-3 mb-1">Ask about this report</h1>

        {report && (

          <p className="text-sm text-gray-600 mb-3">

            {report.document?.originalFilename || "Report"} ·{" "}

            {report.healthScore != null ? `Score ${report.healthScore}` : "AI summary"}

          </p>

        )}

        <ChatShell

          mode="report"

          reportId={reportId}

          initialLanguage={prefs.language || "app"}

          suggestions={SUGGESTIONS}

          subtitle="Sirf is report ke data par jawab — doosri reports ke liye unki chat kholo."

          loadLegacyThread={() =>

            api

              .get<{ thread: { id?: string; messages: { role: string; content: string }[] } }>(

                `/api/reports/${reportId}/chat`

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

