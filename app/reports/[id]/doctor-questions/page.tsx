"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api-client";
import type { DoctorQuestionSet, DoctorQuestion } from "@/types";
import { ArrowLeft, Copy, CircleHelp } from "lucide-react";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function DoctorQuestionsPage() {
  return (
    <ProtectedRoute>
      <DoctorQuestionsContent />
    </ProtectedRoute>
  );
}

function DoctorQuestionsContent() {
  const { t } = useTranslation();
  const { id } = useParams();
  const routeId = id as string;
  const [data, setData] = useState<DoctorQuestionSet | null>(null);
  const [resolvedReportId, setResolvedReportId] = useState(routeId);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [genError, setGenError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    api
      .getDoctorQuestions(routeId)
      .then((res) => {
        setData(res);
        if (res.reportId) setResolvedReportId(res.reportId);
      })
      .catch((err: Error) => {
        setData(null);
        setError(err.message || "Could not load doctor questions.");
      })
      .finally(() => setLoading(false));
  }, [routeId]);

  useEffect(() => {
    load();
  }, [load]);

  const generate = async (force?: boolean) => {
    setGenerating(true);
    setGenError("");
    try {
      const res = await api.generateDoctorQuestions(routeId, force);
      setData(res);
      if (res.reportId) setResolvedReportId(res.reportId);
    } catch (err: unknown) {
      setGenError(
        err instanceof Error
          ? err.message
          : "Could not generate doctor questions. Please try again."
      );
    } finally {
      setGenerating(false);
    }
  };

  const copyAll = () => {
    if (!data?.questions?.length) return;
    const text = data.questions
      .map((q) => `[${q.category}] ${q.question}\n— ${q.whyAsk}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
  };

  const grouped = (data?.questions || []).reduce<Record<string, DoctorQuestion[]>>(
    (acc, q) => {
      if (!acc[q.category]) acc[q.category] = [];
      acc[q.category].push(q);
      return acc;
    },
    {}
  );

  const hasQuestions = (data?.exists && data.questions.length > 0) || false;

  if (error && !loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader />
        <main className="mx-auto max-w-lg px-4 py-6 pb-12">
          <Link
            href={`/reports/${routeId}`}
            className="inline-flex items-center gap-1 text-sm text-gray-500 mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Report
          </Link>
          <Alert variant="error">{error}</Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="mx-auto max-w-lg px-4 py-6 pb-12">
        <Link
          href={`/reports/${resolvedReportId}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 mb-4 min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Report
        </Link>

        <div className="flex items-start gap-3 mb-2">
          <CircleHelp className="h-7 w-7 text-brand-600 shrink-0 mt-0.5" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Questions for Doctor</h1>
            <p className="text-sm text-gray-500 mt-1">
              Prepare helpful questions to discuss this report with your healthcare
              professional.
            </p>
          </div>
        </div>

        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4">
          {t("doctorQuestions.helper")}
        </p>

        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            onClick={() => generate(hasQuestions)}
            loading={generating}
            className="min-h-[44px]"
          >
            {hasQuestions ? "Regenerate Questions" : "Generate Questions"}
          </Button>
          {hasQuestions ? (
            <Button variant="outline" onClick={copyAll} className="min-h-[44px]">
              <Copy className="h-4 w-4" /> Copy all
            </Button>
          ) : null}
        </div>

        {genError && <Alert variant="error" className="mb-4">{genError}</Alert>}

        {loading ? (
          <Skeleton className="h-48 w-full rounded-2xl" />
        ) : !hasQuestions ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center">
            <p className="text-sm text-gray-600 mb-2">
              {data?.message || "No doctor questions generated yet."}
            </p>
            <p className="text-xs text-gray-500">
              Tap Generate Questions to create discussion prompts from your saved report.
            </p>
          </div>
        ) : (
          <>
            {data?.summary && (
              <Alert variant="info" className="mb-4">
                {data.summary}
              </Alert>
            )}
            <div className="space-y-4">
              {Object.entries(grouped).map(([cat, qs]) => (
                <section
                  key={cat}
                  className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <h2 className="font-semibold text-brand-700 mb-2">{cat}</h2>
                  <ul className="space-y-3">
                    {qs.map((q, i) => (
                      <li key={i} className="text-sm">
                        <p className="font-medium text-gray-900">{q.question}</p>
                        <p className="text-gray-500 text-xs mt-1">{q.whyAsk}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
