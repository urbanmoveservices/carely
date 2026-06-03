"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminTable } from "@/components/admin/AdminTable";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert } from "@/components/ui/Alert";
import { adminApi } from "@/lib/admin-api-client";
import { formatDate, truncate } from "@/lib/utils";
import type { AdminReportRow, User } from "@/types";
import { Eye, Download } from "lucide-react";
import Link from "next/link";

export default function AdminReportsPage() {
  return (
    <AdminLayout>
      {(user) => <AdminReportsContent user={user} />}
    </AdminLayout>
  );
}

function AdminReportsContent({ user }: { user: User }) {
  const [reports, setReports] = useState<AdminReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi
      .get<AdminReportRow[]>("/api/admin/reports")
      .then(setReports)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    {
      key: "id",
      header: "Report ID",
      render: (r: AdminReportRow) => (
        <span className="font-mono text-xs">{r.id.slice(0, 10)}...</span>
      ),
    },
    {
      key: "user",
      header: "User",
      render: (r: AdminReportRow) => (
        <div>
          <p className="font-medium">{r.user.name}</p>
          <p className="text-xs text-gray-400">{r.user.email}</p>
        </div>
      ),
    },
    {
      key: "document",
      header: "Document",
      render: (r: AdminReportRow) => r.document.originalFilename,
    },
    {
      key: "summary",
      header: "Summary",
      render: (r: AdminReportRow) => (
        <span className="text-gray-600">{truncate(r.summary, 60)}</span>
      ),
    },
    {
      key: "date",
      header: "Created",
      render: (r: AdminReportRow) => formatDate(r.createdAt),
    },
    {
      key: "actions",
      header: "Actions",
      render: (r: AdminReportRow) => (
        <div className="flex gap-1">
          <Link href={`/admin/reports/${r.id}`}>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
              View
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            loading={downloadingId === r.id}
            onClick={async () => {
              setDownloadingId(r.id);
              try {
                await adminApi.downloadReportPdf(r.id);
              } catch (err: any) {
                setError(err.message || "PDF download failed");
              } finally {
                setDownloadingId(null);
              }
            }}
          >
            <Download className="h-4 w-4" />
            PDF
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div>
        <AdminHeader title="Reports" user={user} />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div>
      <AdminHeader
        title="Reports"
        description={`${reports.length} reports generated`}
        user={user}
      />
      {error && (
        <Alert variant="error" className="mb-4">{error}</Alert>
      )}
      <AdminTable
        data={reports}
        columns={columns}
        searchPlaceholder="Search by user or filename..."
        searchFn={(r, q) =>
          r.user.name.toLowerCase().includes(q) ||
          r.user.email.toLowerCase().includes(q) ||
          r.document.originalFilename.toLowerCase().includes(q)
        }
        emptyMessage="No reports generated yet"
      />
    </div>
  );
}
