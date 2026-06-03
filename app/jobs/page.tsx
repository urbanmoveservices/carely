"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api-client";

type Job = { id: string; type: string; status: string; createdAt: string };

export default function JobsPage() {
  return (
    <ProtectedRoute>
      <JobsContent />
    </ProtectedRoute>
  );
}

function JobsContent() {
  const [jobs, setJobs] = useState<Job[]>([]);

  const load = () => api.get<{ jobs: Job[] }>("/api/jobs").then((r) => setJobs(r.jobs));

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Link href="/settings" className="text-sm text-brand-600 hover:underline">
          ← Settings
        </Link>
        <h1 className="text-2xl font-bold mt-4 mb-6">Background jobs</h1>
        <Card>
          <CardContent className="divide-y p-0">
            {jobs.map((j) => (
              <div key={j.id} className="flex justify-between items-center px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{j.type}</p>
                  <p className="text-xs text-gray-400">{new Date(j.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{j.status}</Badge>
                  {j.status === "failed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await api.post(`/api/jobs/${j.id}/retry`, {});
                        load();
                      }}
                    >
                      Retry
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
