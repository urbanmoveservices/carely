"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminTable } from "@/components/admin/AdminTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { adminApi } from "@/lib/admin-api-client";
import { formatDate, formatDateTime } from "@/lib/utils";
import { getLanguageDisplayName } from "@/lib/i18n/languages";
import type { AdminUserRow, User } from "@/types";
import { Eye, UserCheck, UserX } from "lucide-react";

export default function AdminUsersPage() {
  return (
    <AdminLayout>
      {(user) => <AdminUsersContent user={user} />}
    </AdminLayout>
  );
}

function AdminUsersContent({ user }: { user: User }) {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchUsers = () => {
    setLoading(true);
    adminApi
      .get<AdminUserRow[]>("/api/admin/users")
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (targetUser: AdminUserRow) => {
    if (targetUser.id === user.id) return;
    const action = targetUser.isActive ? "deactivate" : "reactivate";
    if (!confirm(`Are you sure you want to ${action} ${targetUser.email}?`)) return;

    setToggling(targetUser.id);
    try {
      await adminApi.patch(`/api/admin/users/${targetUser.id}/status`, {
        isActive: !targetUser.isActive,
      });
      fetchUsers();
    } catch {
      // fail silently
    } finally {
      setToggling(null);
    }
  };

  const columns = [
    { key: "name", header: "Name", render: (r: AdminUserRow) => r.name },
    { key: "email", header: "Email", render: (r: AdminUserRow) => r.email },
    {
      key: "language",
      header: "Language",
      render: (r: AdminUserRow) => (
        <span className="text-xs text-gray-600">
          {getLanguageDisplayName(r.language || "en")}
        </span>
      ),
    },
    {
      key: "plan",
      header: "Plan",
      render: (r: AdminUserRow) => (
        <Badge variant="info">{r.currentPlan || "free"}</Badge>
      ),
    },
    {
      key: "verified",
      header: "Verified",
      render: (r: AdminUserRow) => (
        <Badge variant={r.emailVerified ? "success" : "warning"}>
          {r.emailVerified ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      key: "usage",
      header: "Usage",
      render: (r: AdminUserRow) => (
        <span className="text-xs text-gray-600">
          {r.uploadsUsed ?? 0}↑ {r.aiSummariesUsed ?? 0} AI
        </span>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (r: AdminUserRow) => (
        <Badge variant={r.role === "admin" ? "admin" : "user"}>{r.role}</Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r: AdminUserRow) => (
        <Badge variant={r.isActive ? "success" : "error"}>
          {r.isActive ? "Active" : "Disabled"}
        </Badge>
      ),
    },
    {
      key: "lastLogin",
      header: "Last Login",
      render: (r: AdminUserRow) =>
        r.lastLoginAt ? formatDateTime(r.lastLoginAt) : <span className="text-gray-400">Never</span>,
    },
    {
      key: "joined",
      header: "Joined",
      render: (r: AdminUserRow) => formatDate(r.createdAt),
    },
    {
      key: "docs",
      header: "Docs",
      render: (r: AdminUserRow) => r.documentCount,
    },
    {
      key: "reports",
      header: "Reports",
      render: (r: AdminUserRow) => r.reportCount,
    },
    {
      key: "actions",
      header: "Actions",
      render: (r: AdminUserRow) => (
        <div className="flex gap-1">
          <Link href={`/admin/users/${r.id}`}>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          {r.id !== user.id && (
            <Button
              variant="ghost"
              size="sm"
              disabled={toggling === r.id}
              onClick={() => handleToggleStatus(r)}
              title={r.isActive ? "Deactivate user" : "Reactivate user"}
            >
              {r.isActive ? (
                <UserX className="h-4 w-4 text-red-500" />
              ) : (
                <UserCheck className="h-4 w-4 text-green-500" />
              )}
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div>
        <AdminHeader title="Users" description="Manage platform users" user={user} />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div>
      <AdminHeader
        title="Users"
        description={`${users.length} registered users`}
        user={user}
      />
      <AdminTable
        data={users}
        columns={columns}
        searchPlaceholder="Search by name or email..."
        searchFn={(r, q) =>
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q)
        }
        filterOptions={[
          { label: "Users", value: "user" },
          { label: "Admins", value: "admin" },
          { label: "Active", value: "active" },
          { label: "Disabled", value: "disabled" },
        ]}
        filterFn={(r, f) => {
          if (f === "active") return r.isActive;
          if (f === "disabled") return !r.isActive;
          return r.role === f;
        }}
        emptyMessage="No users found"
      />
    </div>
  );
}
