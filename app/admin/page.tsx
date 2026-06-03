"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert } from "@/components/ui/Alert";
import { adminApi } from "@/lib/admin-api-client";
import { STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatBytes } from "@/lib/utils";
import type {
  AdminStats,
  AdminUserRow,
  AdminDocumentRow,
  AdminBillingStats,
  User,
} from "@/types";
import {
  Users,
  FileText,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertCircle,
  ScanText,
  Bell,
  MessageCircle,
} from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <AdminLayout>
      {(user) => <AdminDashboardContent user={user} />}
    </AdminLayout>
  );
}

function AdminDashboardContent({ user }: { user: User }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [billing, setBilling] = useState<AdminBillingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      adminApi.get<AdminStats>("/api/admin/stats"),
      adminApi.get<AdminBillingStats>("/api/admin/billing/stats"),
    ])
      .then(([s, b]) => {
        setStats(s);
        setBilling(b);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <AdminHeader title="Dashboard" description="Overview of your platform" user={user} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <AdminHeader title="Dashboard" user={user} />
        <Alert variant="error">{error}</Alert>
      </div>
    );
  }

  if (!stats) return null;

  const userColumns = [
    { key: "name", header: "Name", render: (r: AdminUserRow) => r.name },
    { key: "email", header: "Email", render: (r: AdminUserRow) => r.email },
    {
      key: "role",
      header: "Role",
      render: (r: AdminUserRow) => (
        <Badge variant={r.role === "admin" ? "admin" : "user"}>{r.role}</Badge>
      ),
    },
    {
      key: "joined",
      header: "Joined",
      render: (r: AdminUserRow) => formatDate(r.createdAt),
    },
  ];

  const docColumns = [
    {
      key: "filename",
      header: "Filename",
      render: (r: AdminDocumentRow) => r.originalFilename,
    },
    {
      key: "user",
      header: "User",
      render: (r: AdminDocumentRow) => r.user.name,
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
        <Badge variant={(r.uploadStatus as any) || "default"}>
          {STATUS_LABELS[r.uploadStatus] || r.uploadStatus}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <AdminHeader
        title="Dashboard"
        description="Overview of your platform"
        user={user}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <AdminStatCard title="Total Users" value={stats.totalUsers} icon={Users} color="blue" />
        <AdminStatCard title="Total Documents" value={stats.totalDocuments} icon={FileText} color="teal" />
        <AdminStatCard title="Total Reports" value={stats.totalReports} icon={ClipboardList} color="purple" />
        <AdminStatCard title="Text Extracted" value={stats.textExtractedDocuments} icon={ScanText} color="green" />
        <AdminStatCard title="AI Completed" value={stats.completedReports} icon={CheckCircle2} color="green" />
        <AdminStatCard title="Processing" value={stats.processingDocuments} icon={Clock} color="yellow" />
        <AdminStatCard title="Failed" value={stats.failedDocuments} icon={AlertCircle} color="red" />
        <AdminStatCard title="Total Reminders" value={stats.totalReminders ?? 0} icon={Bell} color="teal" />
        <AdminStatCard title="Pending Reminders" value={stats.pendingReminders ?? 0} icon={Bell} color="yellow" />
        <AdminStatCard title="Completed Reminders" value={stats.doneReminders ?? 0} icon={CheckCircle2} color="green" />
        <AdminStatCard title="Family Members" value={stats.totalFamilyMembers ?? 0} icon={Users} color="blue" />
        <AdminStatCard title="Health Insights" value={stats.totalInsights ?? 0} icon={Bell} color="purple" />
        <AdminStatCard title="Reports This Month" value={stats.reportsThisMonth ?? 0} icon={ClipboardList} color="teal" />
        <AdminStatCard title="Active Health Risks" value={stats.activeHealthRisks ?? 0} icon={AlertCircle} color="red" />
        <AdminStatCard title="Critical Risks" value={stats.criticalHealthRisks ?? 0} icon={AlertCircle} color="red" />
        <AdminStatCard title="Warning Risks" value={stats.warningHealthRisks ?? 0} icon={AlertCircle} color="yellow" />
        <AdminStatCard title="Pending Suggestions" value={stats.pendingReminderSuggestions ?? 0} icon={Bell} color="yellow" />
        <AdminStatCard title="Notifications" value={stats.totalNotifications ?? 0} icon={Bell} color="blue" />
        <AdminStatCard title="Chat Threads" value={stats.totalChatThreads ?? 0} icon={MessageCircle} color="teal" />
        <AdminStatCard title="Chat Messages" value={stats.totalChatMessages ?? 0} icon={MessageCircle} color="purple" />
        <AdminStatCard
          title="Failed Chats (30d)"
          value={stats.failedChatCallsLast30Days ?? 0}
          icon={MessageCircle}
          color="yellow"
        />
      </div>

      {billing && (
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Billing & usage ({billing.monthKey})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-4">
            <AdminStatCard title="Free users" value={billing.usersByPlan.free} icon={Users} color="blue" />
            <AdminStatCard title="Pro users" value={billing.usersByPlan.pro} icon={Users} color="teal" />
            <AdminStatCard title="Family users" value={billing.usersByPlan.family} icon={Users} color="purple" />
            <AdminStatCard title="Uploads (month)" value={billing.uploadsThisMonth} icon={FileText} color="green" />
            <AdminStatCard title="AI summaries" value={billing.aiSummariesThisMonth} icon={ClipboardList} color="yellow" />
          </div>
          {billing.nearLimitUsers.length > 0 && (
            <p className="text-sm text-amber-800">
              {billing.nearLimitUsers.length} user(s) near plan limits this month.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Users
          </h2>
          <AdminTable data={stats.recentUsers} columns={userColumns} emptyMessage="No users yet" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Documents
          </h2>
          <AdminTable data={stats.recentDocuments} columns={docColumns} emptyMessage="No documents yet" />
        </div>
      </div>
    </div>
  );
}
