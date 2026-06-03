"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { adminApi } from "@/lib/admin-api-client";
import { formatDateTime, truncate } from "@/lib/utils";
import type { AuditLogEntry, AuditLogResponse, User } from "@/types";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

const ACTION_OPTIONS = [
  "USER_SIGNUP",
  "USER_LOGIN",
  "PASSWORD_CHANGED",
  "PROFILE_UPDATED",
  "DOCUMENT_UPLOADED",
  "DOCUMENT_EXTRACTION_STARTED",
  "DOCUMENT_EXTRACTION_COMPLETED",
  "DOCUMENT_EXTRACTION_FAILED",
  "AI_SUMMARY_STARTED",
  "AI_SUMMARY_COMPLETED",
  "AI_SUMMARY_FAILED",
  "PDF_DOWNLOADED",
  "ADMIN_LOGIN",
  "ADMIN_VIEWED_DASHBOARD",
  "ADMIN_VIEWED_USER",
  "ADMIN_CHANGED_USER_ROLE",
  "ADMIN_UPDATED_USER_STATUS",
  "ADMIN_DELETED_DOCUMENT",
  "ADMIN_DOWNLOADED_REPORT",
  "ADMIN_VIEWED_REPORT",
  "ADMIN_CLEANUP_FILES",
];

const ENTITY_TYPES = ["user", "document", "report"];

export default function AdminAuditLogsPage() {
  return (
    <AdminLayout>
      {(user) => <AuditLogsContent user={user} />}
    </AdminLayout>
  );
}

function AuditLogsContent({ user }: { user: User }) {
  const [data, setData] = useState<AuditLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [emailSearch, setEmailSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "25");
      if (emailSearch) params.set("actorEmail", emailSearch);
      if (actionFilter) params.set("action", actionFilter);
      if (entityFilter) params.set("entityType", entityFilter);

      const result = await adminApi.get<AuditLogResponse>(
        `/api/admin/audit-logs?${params.toString()}`
      );
      setData(result);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [page, emailSearch, actionFilter, entityFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  const actionColor = (action: string) => {
    if (action.includes("FAILED")) return "error";
    if (action.includes("LOGIN") || action.includes("SIGNUP")) return "info";
    if (action.includes("DELETED") || action.includes("DEACTIVAT")) return "warning";
    if (action.includes("COMPLETED") || action.includes("CHANGED") || action.includes("UPDATED")) return "success";
    return "default";
  };

  return (
    <div>
      <AdminHeader
        title="Audit Logs"
        description={data ? `${data.total} total events` : "Loading..."}
        user={user}
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Actor Email</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="Search by email..."
                  value={emailSearch}
                  onChange={(e) => {
                    setEmailSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
            <div className="min-w-[180px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Action</label>
              <select
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All actions</option>
                {ACTION_OPTIONS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[140px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Entity Type</label>
              <select
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                value={entityFilter}
                onChange={(e) => {
                  setEntityFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All types</option>
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : !data || data.items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No audit log entries found.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {log.actorEmail || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {log.actorRole ? (
                        <Badge variant={log.actorRole === "admin" ? "admin" : "user"} className="text-xs">
                          {log.actorRole}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={actionColor(log.action) as any} className="text-xs font-mono">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {log.entityType && (
                        <span>
                          {log.entityType}
                          {log.entityId && (
                            <span className="text-gray-400 ml-1">
                              {truncate(log.entityId, 12)}
                            </span>
                          )}
                        </span>
                      )}
                      {!log.entityType && <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                      {log.ipAddress || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px]">
                      {log.metadata ? (
                        <span className="font-mono" title={JSON.stringify(log.metadata, null, 2)}>
                          {truncate(JSON.stringify(log.metadata), 50)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-600">
                Page {data.page} of {totalPages} ({data.total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
