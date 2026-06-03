"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { api } from "@/lib/api-client";

type Row = {
  id: string;
  testName: string;
  markerKey: string;
  valueText?: string | null;
  unit?: string | null;
  status?: string | null;
};

export default function ReviewValuesPage() {
  return (
    <ProtectedRoute>
      <ReviewValues />
    </ProtectedRoute>
  );
}

function ReviewValues() {
  const documentId = useParams().id as string;
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState({
    testName: "",
    markerKey: "",
    valueText: "",
    unit: "",
    status: "unknown",
  });

  const load = () =>
    api
      .get<{ values: Row[] }>(`/api/documents/${documentId}/lab-values`)
      .then((r) => setRows(r.values));

  useEffect(() => {
    load();
  }, [documentId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Link href={`/documents/${documentId}`} className="text-sm text-brand-600 hover:underline">
          ← Document
        </Link>
        <h1 className="text-2xl font-bold mt-4 mb-2">Review lab values</h1>
        <Alert variant="info" className="mb-6 text-sm">
          Manual corrections are used for trends and the health risk dashboard. They do not replace the original AI report.
        </Alert>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add value</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {(["testName", "markerKey", "valueText", "unit", "status"] as const).map((k) => (
              <input
                key={k}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder={k}
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              />
            ))}
            <Button
              className="sm:col-span-2"
              onClick={async () => {
                await api.post(`/api/documents/${documentId}/lab-values`, form);
                setForm({ testName: "", markerKey: "", valueText: "", unit: "", status: "unknown" });
                load();
              }}
            >
              Save & sync trends
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Saved values</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {rows.map((r) => (
              <div key={r.id} className="flex justify-between border-b py-2">
                <span>
                  {r.testName} — {r.valueText} {r.unit} ({r.status})
                </span>
                <button
                  type="button"
                  className="text-red-600 text-xs"
                  onClick={async () => {
                    await api.delete(`/api/lab-values/${r.id}`);
                    load();
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
        <Link href="/health-risks" className="inline-block mt-4 text-sm text-brand-600 underline">
          View health risks
        </Link>
      </main>
    </div>
  );
}
