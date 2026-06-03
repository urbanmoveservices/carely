"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminTable } from "@/components/admin/AdminTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { adminApi } from "@/lib/admin-api-client";
import { STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatBytes } from "@/lib/utils";
import type { AdminDocumentRow, User } from "@/types";
import { Trash2, Eye } from "lucide-react";
import Link from "next/link";

export default function AdminDocumentsPage() {
  return (
    <AdminLayout>
      {(user) => <AdminDocumentsContent user={user} />}
    </AdminLayout>
  );
}

function AdminDocumentsContent({ user }: { user: User }) {
  const [docs, setDocs] = useState<AdminDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    adminApi
      .get<AdminDocumentRow[]>("/api/admin/documents")
      .then(setDocs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await adminApi.delete(`/api/admin/documents/${deleteId}`);
      setDocs((prev) => prev.filter((d) => d.id !== deleteId));
    } catch {
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const columns = [
    {
      key: "filename",
      header: "Filename",
      render: (r: AdminDocumentRow) => (
        <span className="font-medium">{r.originalFilename}</span>
      ),
    },
    {
      key: "user",
      header: "User",
      render: (r: AdminDocumentRow) => (
        <div>
          <p className="font-medium">{r.user.name}</p>
          <p className="text-xs text-gray-400">{r.user.email}</p>
          {r.familyMember && (
            <p className="text-xs text-brand-600 mt-0.5">
              For: {r.familyMember.fullName} ({r.familyMember.relation})
            </p>
          )}
        </div>
      ),
    },
    {
      key: "mode",
      header: "Mode",
      render: (r: AdminDocumentRow) => (
        <span className="text-xs">
          {r.uploadMode === "multi_image"
            ? `Multi (${r.pageCount ?? 0} pg)`
            : "Single"}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (r: AdminDocumentRow) => r.fileType,
    },
    {
      key: "ocrFail",
      header: "OCR failed",
      render: (r: AdminDocumentRow) =>
        r.uploadMode === "multi_image" && (r.failedPageCount ?? 0) > 0 ? (
          <span className="text-red-600 text-xs">{r.failedPageCount}</span>
        ) : (
          "—"
        ),
    },
    {
      key: "size",
      header: "Size",
      render: (r: AdminDocumentRow) => formatBytes(r.fileSize),
    },
    {
      key: "status",
      header: "Status",
      render: (r: AdminDocumentRow) => (
        <div>
          <Badge variant={(r.uploadStatus as any) || "default"}>
            {STATUS_LABELS[r.uploadStatus] || r.uploadStatus}
          </Badge>
          {r.uploadStatus === "failed" && r.errorMessage && (
            <p
              className="text-xs text-red-500 mt-0.5 max-w-[150px] truncate"
              title={r.errorMessage}
            >
              {r.errorMessage}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "text",
      header: "Extracted",
      render: (r: AdminDocumentRow) =>
        r.extractedTextLength > 0 ? (
          <span className="text-xs text-gray-500">
            {r.extractedTextLength.toLocaleString()} chars
          </span>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        ),
    },
    {
      key: "date",
      header: "Uploaded",
      render: (r: AdminDocumentRow) => formatDate(r.createdAt),
    },
    {
      key: "actions",
      header: "Actions",
      render: (r: AdminDocumentRow) => (
        <div className="flex gap-1">
          {r.reportId && (
            <Link href={`/admin/reports/${r.reportId}`}>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
                Report
              </Button>
            </Link>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteId(r.id)}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div>
        <AdminHeader title="Documents" user={user} />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div>
      <AdminHeader
        title="Documents"
        description={`${docs.length} documents uploaded`}
        user={user}
      />
      <AdminTable
        data={docs}
        columns={columns}
        searchPlaceholder="Search by filename or user email..."
        searchFn={(r, q) =>
          r.originalFilename.toLowerCase().includes(q) ||
          r.user.email.toLowerCase().includes(q)
        }
        filterOptions={[
          { label: "Uploaded", value: "uploaded" },
          { label: "Processing", value: "processing" },
          { label: "Text Extracted", value: "text_extracted" },
          { label: "AI Completed", value: "ai_completed" },
          { label: "Failed", value: "failed" },
        ]}
        filterFn={(r, f) => r.uploadStatus === f}
        emptyMessage="No documents found"
      />

      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Document"
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      >
        Are you sure you want to delete this document? This action cannot be
        undone and any related report will also be deleted.
      </Modal>
    </div>
  );
}
