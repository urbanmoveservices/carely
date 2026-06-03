"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/admin-api-client";

export default function AdminSharingPage() {
  return <AdminLayout>{() => <AdminSharingContent />}</AdminLayout>;
}

function AdminSharingContent() {
  const [data, setData] = useState<{
    invites: { id: string; invitedEmail: string; status: string; tokenMasked: string }[];
    access: { id: string; owner: { email: string }; caregiver: { email: string } }[];
    shareLinks: { id: string; tokenMasked: string; accessCount: number }[];
    enabledEmergencyCards: number;
  } | null>(null);

  useEffect(() => {
    adminApi.getSharingOverview().then(setData as never);
  }, []);

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Sharing Overview</h1>
      {data && (
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border bg-white p-4">
            <h2 className="font-semibold mb-2">Caregiver invites</h2>
            <ul className="text-sm space-y-1 max-h-48 overflow-y-auto">
              {data.invites.map((i) => (
                <li key={i.id}>
                  {i.invitedEmail} — {i.status} ({i.tokenMasked})
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <h2 className="font-semibold mb-2">Active access</h2>
            <ul className="text-sm space-y-1">
              {data.access.map((a) => (
                <li key={a.id}>
                  {a.caregiver.email} ← {a.owner.email}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <h2 className="font-semibold mb-2">Doctor share links</h2>
            <p className="text-sm text-gray-500">{data.shareLinks.length} recent links (tokens masked)</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <h2 className="font-semibold mb-2">Emergency cards</h2>
            <p className="text-2xl font-bold">{data.enabledEmergencyCards}</p>
            <p className="text-xs text-gray-500">enabled public cards</p>
          </div>
        </div>
      )}
    </>
  );
}
