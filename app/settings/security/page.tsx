"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { api } from "@/lib/api-client";

export default function SecurityPage() {
  return (
    <ProtectedRoute>
      <SecurityContent />
    </ProtectedRoute>
  );
}

function SecurityContent() {
  const [logs, setLogs] = useState<
    { id: string; action: string; resourceType?: string | null; createdAt: string }[]
  >([]);

  useEffect(() => {
    api
      .get<{
        logs: { id: string; action: string; resourceType?: string | null; createdAt: string }[];
      }>("/api/access-logs")
      .then((r) => setLogs(r.logs));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Link href="/settings" className="text-sm text-brand-600 hover:underline">
          ← Settings
        </Link>
        <h1 className="text-2xl font-bold mt-4 mb-6">Security & access</h1>
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {logs.length === 0 && <p className="text-gray-500">No access logs yet.</p>}
            {logs.map((l) => (
              <div key={l.id} className="flex justify-between border-b border-gray-50 py-2">
                <span className="text-gray-800">{l.action}</span>
                <span className="text-gray-400 text-xs">
                  {new Date(l.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
