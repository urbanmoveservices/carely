"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { adminApi } from "@/lib/admin-api-client";
import type { User } from "@/types";

type Log = {
  id: string;
  to: string;
  subject: string;
  type: string;
  status: string;
  createdAt: string;
};

export default function AdminEmailLogsPage() {
  return (
    <AdminLayout>{(user) => <Content user={user} />}</AdminLayout>
  );
}

function Content({ user }: { user: User }) {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    adminApi.get<{ logs: Log[] }>("/api/admin/email-logs").then((r) => setLogs(r.logs));
  }, []);

  return (
    <div>
      <AdminHeader title="Email logs" user={user} />
      <Card>
        <CardContent className="divide-y p-0 text-sm">
          {logs.map((l) => (
            <div key={l.id} className="px-4 py-3">
              <p className="font-medium">{l.subject}</p>
              <p className="text-gray-500">
                {l.to} · {l.type} · {l.status}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
