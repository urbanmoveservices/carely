"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { MobileShell } from "@/components/MobileShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api-client";
import type { CaregiverSharedOwner } from "@/types";

export default function CaregiverPage() {
  return (
    <ProtectedRoute>
      <CaregiverContent />
    </ProtectedRoute>
  );
}

function CaregiverContent() {
  const [owners, setOwners] = useState<CaregiverSharedOwner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getCaregiverSharedWithMe()
      .then((r) => setOwners(r.owners))
      .finally(() => setLoading(false));
  }, []);

  return (
    <MobileShell>
      <AppHeader />
      <main className="mx-auto max-w-lg px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Caregiver Dashboard</h1>
        <p className="text-sm text-gray-500 mb-4">Read-only access shared with you.</p>
        {loading ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : owners.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-12">
            No one has shared health data with you yet. Accept an invite link after logging in with the invited email.
          </p>
        ) : (
          <ul className="space-y-4">
            {owners.map((o) => (
              <li key={o.accessId} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <h2 className="font-semibold text-gray-900">{o.owner.name}</h2>
                <p className="text-xs text-gray-500 mb-3">{o.owner.email}</p>
                {o.permissions.canViewFamily && o.familyMembers.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Family</p>
                    {o.familyMembers.map((m) => (
                      <p key={m.id} className="text-sm text-gray-700">
                        {m.fullName} ({m.relation})
                      </p>
                    ))}
                  </div>
                )}
                {o.permissions.canViewReports && o.reports.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Reports</p>
                    <ul className="space-y-2">
                      {o.reports.map((r) => (
                        <li key={r.id} className="text-sm rounded-lg bg-gray-50 p-2">
                          <p className="font-medium text-gray-800">{r.originalFilename}</p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-3">{r.summary}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </MobileShell>
  );
}
