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
import type { User } from "@/types";

type AdminRiskRow = {
  id: string;
  user: { id: string; name: string; email: string };
  familyMember: { id: string; fullName: string; relation: string } | null;
  category: string;
  level: string;
  title: string;
  status: string;
  reportId: string | null;
  detectedAt: string;
};

export default function AdminHealthRisksPage() {
  return (
    <AdminLayout>
      {(user) => <AdminHealthRisksContent user={user} />}
    </AdminLayout>
  );
}

function AdminHealthRisksContent({ user }: { user: User }) {
  const [items, setItems] = useState<AdminRiskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi
      .get<{ items: AdminRiskRow[] }>("/api/admin/health-risks?limit=200")
      .then((r) => setItems(r.items))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    {
      key: "user",
      header: "User",
      render: (r: AdminRiskRow) => (
        <span>
          {r.user.name}
          <br />
          <span className="text-xs text-gray-500">{r.user.email}</span>
        </span>
      ),
    },
    {
      key: "family",
      header: "Family member",
      render: (r: AdminRiskRow) => r.familyMember?.fullName || "—",
    },
    { key: "category", header: "Category", render: (r: AdminRiskRow) => r.category },
    {
      key: "level",
      header: "Level",
      render: (r: AdminRiskRow) => (
        <Badge variant={r.level === "critical" ? "critical" : r.level === "warning" ? "warning" : "default"}>
          {r.level}
        </Badge>
      ),
    },
    { key: "title", header: "Title", render: (r: AdminRiskRow) => r.title },
    {
      key: "report",
      header: "Report",
      render: (r: AdminRiskRow) => r.reportId || "—",
    },
    {
      key: "detected",
      header: "Detected",
      render: (r: AdminRiskRow) => formatDate(r.detectedAt),
    },
  ];

  return (
    <div>
      <AdminHeader
        title="Health Risks"
        description="Read-only view of platform health risk cards"
        user={user}
      />
      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <AdminTable data={items} columns={columns} emptyMessage="No health risks yet" />
      )}
    </div>
  );
}
