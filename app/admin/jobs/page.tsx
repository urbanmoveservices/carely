"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { adminApi } from "@/lib/admin-api-client";
import type { User } from "@/types";

type Job = {
  id: string;
  type: string;
  status: string;
  attempts: number;
  error?: string | null;
  createdAt: string;
};

export default function AdminJobsPage() {
  return (
    <AdminLayout>{(user) => <Content user={user} />}</AdminLayout>
  );
}

function Content({ user }: { user: User }) {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    adminApi.get<{ jobs: Job[] }>("/api/admin/jobs").then((r) => setJobs(r.jobs));
  }, []);

  return (
    <div>
      <AdminHeader title="Background Jobs" description="Queue status (all users)" user={user} />
      <Card>
        <CardContent className="divide-y divide-gray-100 p-0">
          {jobs.map((j) => (
            <div key={j.id} className="px-4 py-3 text-sm flex justify-between gap-2">
              <div>
                <p className="font-medium">{j.type}</p>
                <p className="text-xs text-gray-500">{j.id}</p>
                {j.error && <p className="text-xs text-red-600 mt-1">{j.error}</p>}
              </div>
              <Badge variant={j.status === "completed" ? "completed" : j.status === "failed" ? "critical" : "info"}>
                {j.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
