"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminTable } from "@/components/admin/AdminTable";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert } from "@/components/ui/Alert";
import { adminApi } from "@/lib/admin-api-client";
import { formatDate } from "@/lib/utils";
import type { User, Reminder } from "@/types";

type AdminReminderRow = Reminder & {
  user: { id: string; name: string; email: string };
};

export default function AdminRemindersPage() {
  return (
    <AdminLayout>
      {(user) => <AdminRemindersContent user={user} />}
    </AdminLayout>
  );
}

function AdminRemindersContent({ user }: { user: User }) {
  const [rows, setRows] = useState<AdminReminderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi
      .get<AdminReminderRow[]>("/api/admin/reminders")
      .then(setRows)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    {
      key: "user",
      header: "User",
      render: (r: AdminReminderRow) => (
        <div>
          <p className="text-sm font-medium">{r.user.name}</p>
          <p className="text-xs text-gray-500">{r.user.email}</p>
        </div>
      ),
    },
    {
      key: "member",
      header: "Family member",
      render: (r: AdminReminderRow) =>
        r.familyMember
          ? `${r.familyMember.relation} — ${r.familyMember.fullName}`
          : "—",
    },
    {
      key: "type",
      header: "Type",
      render: (r: AdminReminderRow) => (
        <Badge variant="default" className="capitalize">
          {r.type}
        </Badge>
      ),
    },
    { key: "title", header: "Title", render: (r: AdminReminderRow) => r.title },
    {
      key: "scheduled",
      header: "Scheduled",
      render: (r: AdminReminderRow) => formatDate(r.scheduledAt),
    },
    {
      key: "status",
      header: "Status",
      render: (r: AdminReminderRow) => (
        <Badge
          variant={
            r.status === "done"
              ? "success"
              : r.status === "pending"
                ? "warning"
                : "default"
          }
          className="capitalize"
        >
          {r.status}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <AdminHeader
        title="Reminders"
        description="Read-only view of user reminders (support)"
        user={user}
      />
      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      {loading ? (
        <Skeleton className="h-64" />
      ) : (
        <AdminTable
          data={rows}
          columns={columns}
          emptyMessage="No reminders in the system"
        />
      )}
      <p className="text-xs text-gray-500 mt-4">
        Admins cannot edit user reminders in this phase.
      </p>
    </div>
  );
}
