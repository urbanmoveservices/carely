"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { MobileShell } from "@/components/MobileShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api-client";
import type { LabTestReference } from "@/types";
import { ArrowLeft } from "lucide-react";

export default function LabTestDetailPage() {
  return (
    <ProtectedRoute>
      <LabTestDetail />
    </ProtectedRoute>
  );
}

function LabTestDetail() {
  const { id } = useParams();
  const [test, setTest] = useState<LabTestReference | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getLabTest(id as string).then(setTest).finally(() => setLoading(false));
  }, [id]);

  return (
    <MobileShell>
      <AppHeader />
      <main className="mx-auto max-w-lg px-4 py-6">
        <Link href="/lab-tests" className="inline-flex items-center gap-1 text-sm text-gray-500 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        {loading || !test ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : (
          <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
            <h1 className="text-xl font-bold text-gray-900">{test.name}</h1>
            <p className="text-sm text-gray-500">{test.category}{test.unit ? ` · ${test.unit}` : ""}</p>
            {(test.normalText || test.normalMin != null) && (
              <div>
                <h2 className="text-sm font-semibold text-gray-800">Typical reference</h2>
                <p className="text-sm text-gray-600">
                  {test.normalText ||
                    `${test.normalMin ?? "?"} – ${test.normalMax ?? "?"}`}
                </p>
              </div>
            )}
            <div>
              <h2 className="text-sm font-semibold text-gray-800">Explanation</h2>
              <p className="text-sm text-gray-600">{test.explanation}</p>
            </div>
            {test.highMeaning && (
              <div>
                <h2 className="text-sm font-semibold text-gray-800">If high</h2>
                <p className="text-sm text-gray-600">{test.highMeaning}</p>
              </div>
            )}
            {test.lowMeaning && (
              <div>
                <h2 className="text-sm font-semibold text-gray-800">If low</h2>
                <p className="text-sm text-gray-600">{test.lowMeaning}</p>
              </div>
            )}
            <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl">{test.disclaimer}</p>
          </article>
        )}
      </main>
    </MobileShell>
  );
}
