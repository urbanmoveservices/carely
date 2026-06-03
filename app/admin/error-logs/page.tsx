"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/admin-api-client";
import type { User } from "@/types";

type Log = {
  id: string;
  source: string;
  message: string;
  severity: string;
  isResolved: boolean;
  createdAt: string;
};

export default function AdminErrorLogsPage() {
  return (
    <AdminLayout>{(user) => <Content user={user} />}</AdminLayout>
  );
}

function Content({ user }: { user: User }) {
  const [logs, setLogs] = useState<Log[]>([]);

  const load = () =>
    adminApi
      .get<{ logs: Log[] }>("/api/admin/error-logs?resolved=false")
      .then((r) => setLogs(r.logs));

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <AdminHeader title="Error Logs" description="Server-side errors (no medical text)" user={user} />
      <Card>
        <CardContent className="space-y-3 pt-4">
          {logs.length === 0 && <p className="text-sm text-gray-500">No unresolved errors.</p>}
          {logs.map((log) => (
            <div key={log.id} className="rounded-lg border border-gray-100 p-3 text-sm">
              <p className="font-medium text-gray-900">{log.source}</p>
              <p className="text-gray-600 mt-1">{log.message}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(log.createdAt).toLocaleString()}</p>
              <Button
                size="sm"
                className="mt-2"
                variant="outline"
                onClick={async () => {
                  await adminApi.patch("/api/admin/error-logs", { id: log.id, isResolved: true });
                  load();
                }}
              >
                Mark resolved
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
