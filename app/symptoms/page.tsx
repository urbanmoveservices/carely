"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { MobileShell } from "@/components/MobileShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import type { SymptomJournalEntry } from "@/types";
import { Plus } from "lucide-react";

export default function SymptomsPage() {
  return (
    <ProtectedRoute>
      <SymptomsContent />
    </ProtectedRoute>
  );
}

function SymptomsContent() {
  const [items, setItems] = useState<SymptomJournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSymptomJournal().then((r) => setItems(r.items)).finally(() => setLoading(false));
  }, []);

  return (
    <MobileShell>
      <AppHeader />
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">Symptom Journal</h1>
          <Link href="/symptoms/new">
            <Button size="sm" className="min-h-[44px]">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </Link>
        </div>
        {loading ? (
          <Skeleton className="h-32 w-full rounded-2xl" />
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-12">
            Track symptoms over time to discuss with your doctor.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/symptoms/${e.id}/edit`}
                  className="block rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex justify-between gap-2">
                    <p className="font-medium text-gray-900">{e.title}</p>
                    {e.severity != null && (
                      <Badge variant="warning">Severity {e.severity}/10</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{formatDate(e.occurredAt)}</p>
                  {e.familyMember && (
                    <p className="text-xs text-brand-600 mt-1">{e.familyMember.fullName}</p>
                  )}
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                    {(e.symptoms as string[]).join(", ")}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </MobileShell>
  );
}
