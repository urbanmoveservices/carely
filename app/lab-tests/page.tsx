"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { MobileShell } from "@/components/MobileShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api-client";
import type { LabTestReference } from "@/types";

export default function LabTestsPage() {
  return (
    <ProtectedRoute>
      <LabTestsContent />
    </ProtectedRoute>
  );
}

function LabTestsContent() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<LabTestReference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      const p = new URLSearchParams();
      if (q.trim()) p.set("q", q.trim());
      api
        .getLabTests(p.toString())
        .then((r) => setItems(r.items))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const categories = [...new Set(items.map((i) => i.category))];

  return (
    <MobileShell>
      <AppHeader />
      <main className="mx-auto max-w-lg px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Lab Test Library</h1>
        <p className="text-xs text-gray-500 mb-4">
          Reference ranges vary by lab, age, and clinical context. Always follow your lab report and doctor.
        </p>
        <Input
          placeholder="Search tests…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="mb-4 min-h-[48px]"
        />
        {loading ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : (
          <ul className="space-y-2">
            {items.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/lab-tests/${t.id}`)}
                  className="w-full text-left rounded-xl border border-gray-100 bg-white p-3 active:bg-gray-50"
                >
                  <p className="font-medium text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.category}{t.unit ? ` · ${t.unit}` : ""}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </MobileShell>
  );
}
