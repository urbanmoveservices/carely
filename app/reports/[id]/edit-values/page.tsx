"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { api } from "@/lib/api-client";

export default function EditValuesPage() {
  return (
    <ProtectedRoute>
      <RedirectToDocument />
    </ProtectedRoute>
  );
}

function RedirectToDocument() {
  const reportId = useParams().id as string;
  const router = useRouter();

  useEffect(() => {
    api
      .get<{ documentId: string }>(`/api/reports/${reportId}`)
      .then((r) => router.replace(`/documents/${r.documentId}/review-values`))
      .catch(() => router.replace("/dashboard"));
  }, [reportId, router]);

  return <p className="p-8 text-sm text-gray-500">Redirecting to lab value editor…</p>;
}
