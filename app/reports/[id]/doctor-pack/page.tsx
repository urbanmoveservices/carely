"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api-client";
import { getAuthHeaders } from "@/lib/auth-client";

export default function DoctorPackPage() {
  return (
    <ProtectedRoute>
      <DoctorPack />
    </ProtectedRoute>
  );
}

function DoctorPack() {
  const reportId = useParams().id as string;
  const [pack, setPack] = useState<{ summary?: string; disclaimer?: string } | null>(null);

  useEffect(() => {
    api.get<{ pack: { report: { summary: string }; disclaimer: string } }>(
      `/api/reports/${reportId}/doctor-pack`
    ).then((r) => setPack({ summary: r.pack.report.summary, disclaimer: r.pack.disclaimer }));
  }, [reportId]);

  const downloadPdf = async () => {
    const res = await fetch(`/api/reports/${reportId}/doctor-pack/pdf`, {
      headers: getAuthHeaders(),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `doctor-pack-${reportId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link href={`/reports/${reportId}`} className="text-sm text-brand-600 hover:underline">
          ← Report
        </Link>
        <h1 className="text-2xl font-bold mt-4 mb-4">Doctor visit pack</h1>
        <div className="flex gap-2 mb-6">
          <Button onClick={downloadPdf}>Download PDF</Button>
          <Button
            variant="outline"
            onClick={() => pack?.summary && navigator.clipboard.writeText(pack.summary)}
          >
            Copy summary
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 whitespace-pre-line">
              {pack?.summary || "Loading…"}
            </p>
            <p className="text-xs text-gray-500 mt-4">{pack?.disclaimer}</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
