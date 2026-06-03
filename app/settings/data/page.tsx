"use client";

import { useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { api } from "@/lib/api-client";

export default function DataSettingsPage() {
  return (
    <ProtectedRoute>
      <DataSettings />
    </ProtectedRoute>
  );
}

function DataSettings() {
  const [msg, setMsg] = useState("");
  const [confirm, setConfirm] = useState("");
  const [exports, setExports] = useState<
    { id: string; status: string; createdAt: string }[]
  >([]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Link href="/settings" className="text-sm text-brand-600 hover:underline">
          ← Settings
        </Link>
        <h1 className="text-2xl font-bold mt-4 mb-6">Data & privacy</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Export my data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">
              Download a JSON bundle of your profile, family, reports metadata, and activity logs.
            </p>
            <Button
              onClick={async () => {
                setMsg("");
                const res = await api.post<{
                  export: { id: string; status: string; createdAt: string };
                }>("/api/data-export", {});
                setExports((e) => [res.export, ...e]);
                setMsg("Export queued. Refresh in a moment to download.");
              }}
            >
              Request export
            </Button>
            {exports.map((ex) => (
              <div key={ex.id} className="text-sm flex justify-between items-center border-t pt-2">
                <span>{ex.status}</span>
                {ex.status === "completed" && (
                  <a
                    className="text-brand-600 underline"
                    href={`/api/data-export/${ex.id}/download`}
                    onClick={(e) => {
                      e.preventDefault();
                      api
                        .get(`/api/data-export/${ex.id}/download`)
                        .catch(() => window.open(`/api/data-export/${ex.id}/download`));
                    }}
                  >
                    Download
                  </a>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delete account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert variant="warning">
              Soft-delete: your account is deactivated and deletion is scheduled in 7 days. Type DELETE MY ACCOUNT to confirm.
            </Alert>
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="DELETE MY ACCOUNT"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <Button
              variant="outline"
              onClick={async () => {
                await api.post("/api/account/delete-request", {
                  confirmText: confirm,
                });
                setMsg("Deletion requested. You can cancel from Settings within 7 days.");
              }}
            >
              Request deletion
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                await api.post("/api/account/delete-request/cancel", {});
                setMsg("Deletion cancelled.");
              }}
            >
              Cancel pending deletion
            </Button>
          </CardContent>
        </Card>
        {msg && <p className="text-sm text-brand-700 mt-4">{msg}</p>}
      </main>
    </div>
  );
}
