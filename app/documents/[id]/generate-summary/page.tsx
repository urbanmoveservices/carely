"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { MobileShell } from "@/components/MobileShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Skeleton } from "@/components/ui/Skeleton";
import { ReportContextForm } from "@/components/reports/ReportContextForm";
import { api } from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n/use-translation";
import { formatAiSummaryClientError } from "@/lib/summary-error-messages";
import { dispatchDashboardRefresh } from "@/lib/dashboard-events";
import type {
  GenerateSummaryWithContextResponse,
  ReportContextInput,
  ReportContextResponse,
} from "@/types";
import { ArrowLeft, FileText } from "lucide-react";

export default function GenerateSummaryContextPage() {
  return (
    <ProtectedRoute>
      <GenerateSummaryContextContent />
    </ProtectedRoute>
  );
}

function GenerateSummaryContextContent() {
  const params = useParams();
  const router = useRouter();
  const docId = params.id as string;
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [data, setData] = useState<ReportContextResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getReportContext(docId);
      setData(res);
      if (res.document.upload_status === "ai_completed") {
        router.replace(`/documents/${docId}`);
      }
    } catch (err: any) {
      setError(err.message || "Could not load document");
    } finally {
      setLoading(false);
    }
  }, [docId, router]);

  useEffect(() => {
    load();
  }, [load]);

  const runGenerate = async (body: {
    context?: ReportContextInput;
    skipContext?: boolean;
    consentAcknowledged: boolean;
  }) => {
    setGenerating(true);
    setError("");
    try {
      setProgress(t("reportContext.stepSaving"));
      await new Promise((r) => setTimeout(r, 200));
      setProgress(t("reportContext.stepReading"));
      const res = await api.generateSummaryWithContext(docId, body);
      setProgress(t("reportContext.stepPreparing"));
      dispatchDashboardRefresh();
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          "carely-dashboard-toast",
          "AI summary generated and dashboard updated."
        );
      }
      router.push(`/reports/${(res as GenerateSummaryWithContextResponse).report_id}`);
    } catch (err: any) {
      setError(formatAiSummaryClientError(err));
      setGenerating(false);
      setProgress("");
    }
  };

  if (loading) {
    return (
      <MobileShell>
        <AppHeader />
        <main className="mx-auto max-w-2xl px-4 py-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </main>
      </MobileShell>
    );
  }

  if (!data) {
    return (
      <MobileShell>
        <AppHeader />
        <main className="mx-auto max-w-2xl px-4 py-6">
          <p className="text-red-600">{error || "Document not found"}</p>
          <Link href="/dashboard" className="text-sm text-brand-600 mt-4 inline-block">
            {t("common.backToDashboard")}
          </Link>
        </main>
      </MobileShell>
    );
  }

  if (data.document.upload_status !== "text_extracted") {
    return (
      <MobileShell>
        <AppHeader />
        <main className="mx-auto max-w-2xl px-4 py-6">
          <p className="text-gray-600">{t("reportContext.notReady")}</p>
          <Link href={`/documents/${docId}`} className="text-sm text-brand-600 mt-4 inline-block">
            {t("common.back")}
          </Link>
        </main>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
        <Link
          href={`/documents/${docId}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("common.back")}
        </Link>

        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {t("reportContext.title")}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t("reportContext.subtitle")}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            <FileText className="h-4 w-4" />
            {data.document.original_filename}
          </div>
        </div>

        <ReportContextForm
          initial={data.context ? mapContextToInput(data.context) : undefined}
          suggested={data.suggested_defaults}
          loading={generating}
          progressLabel={progress}
          error={error}
          onBack={() => router.push(`/documents/${docId}`)}
          onSkip={(consent) =>
            runGenerate({ skipContext: true, consentAcknowledged: consent })
          }
          onGenerate={(context, consent) =>
            runGenerate({ context, consentAcknowledged: consent })
          }
        />
      </main>
    </MobileShell>
  );
}

function mapContextToInput(ctx: ReportContextResponse["context"]): ReportContextInput | undefined {
  if (!ctx) return undefined;
  return {
    smokingStatus: ctx.smoking_status as ReportContextInput["smokingStatus"],
    tobaccoUse: ctx.tobacco_use,
    alcoholUse: ctx.alcohol_use as ReportContextInput["alcoholUse"],
    physicalActivity: ctx.physical_activity as ReportContextInput["physicalActivity"],
    sugarIntake: ctx.sugar_intake as ReportContextInput["sugarIntake"],
    foodPreference: ctx.food_preference as ReportContextInput["foodPreference"],
    dietNotes: ctx.diet_notes,
    knownConditions: ctx.known_conditions,
    allergies: ctx.allergies,
    currentMedicines: ctx.current_medicines,
    familyHistory: ctx.family_history,
    symptoms: ctx.symptoms,
    sleepQuality: ctx.sleep_quality as ReportContextInput["sleepQuality"],
    stressLevel: ctx.stress_level as ReportContextInput["stressLevel"],
    waterIntake: ctx.water_intake,
    heightCm: ctx.height_cm ?? undefined,
    weightKg: ctx.weight_kg ?? undefined,
    fastingStatus: ctx.fasting_status as ReportContextInput["fastingStatus"],
    recentFeverOrInfection: ctx.recent_fever_or_infection ?? undefined,
    supplements: ctx.supplements,
    pregnancyStatus: ctx.pregnancy_status as ReportContextInput["pregnancyStatus"],
    doctorDiagnosis: ctx.doctor_diagnosis,
    notes: ctx.notes,
  };
}
