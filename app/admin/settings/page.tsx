"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { removeAdminToken } from "@/lib/admin-auth";
import { adminApi } from "@/lib/admin-api-client";
import type { User } from "@/types";
import { User as UserIcon, Mail, Shield, LogOut, ArrowLeft, Trash2, Search } from "lucide-react";

interface CleanupResult {
  dryRun: boolean;
  orphanedFiles: string[];
  deletedCount: number;
}

export default function AdminSettingsPage() {
  return (
    <AdminLayout>
      {(user) => <AdminSettingsContent user={user} />}
    </AdminLayout>
  );
}

function AdminSettingsContent({ user }: { user: User }) {
  const router = useRouter();
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupError, setCleanupError] = useState<string | null>(null);

  const handleLogout = () => {
    removeAdminToken();
    router.push("/admin/login");
  };

  const runCleanup = async (dryRun: boolean) => {
    if (!dryRun && !confirm("Are you sure you want to delete orphaned files? This cannot be undone.")) return;

    setCleanupLoading(true);
    setCleanupError(null);
    try {
      const result = await adminApi.post<CleanupResult>(
        "/api/admin/maintenance/cleanup-files",
        { dryRun }
      );
      setCleanupResult(result);
    } catch (err: any) {
      setCleanupError(err.message || "Cleanup failed");
    } finally {
      setCleanupLoading(false);
    }
  };

  return (
    <div>
      <AdminHeader title="Settings" description="Admin profile and configuration" user={user} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Admin Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <UserIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Name</p>
                  <p className="font-medium text-gray-900">{user.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Role</p>
                  <Badge variant="admin">{user.role}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>App Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <span className="text-sm text-gray-600">App URL</span>
                <span className="text-sm font-mono text-gray-900">
                  {process.env.NEXT_PUBLIC_APP_URL?.trim() ||
                    "Not configured — set NEXT_PUBLIC_APP_URL"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <span className="text-sm text-gray-600">AI Mode</span>
                <Badge variant="warning">Mock</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <span className="text-sm text-gray-600">Max Upload</span>
                <span className="text-sm font-medium text-gray-900">10 MB</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Storage Cleanup */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Storage Cleanup</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Scan for orphaned upload files that are no longer referenced by any document in the database.
          </p>

          <div className="flex gap-3 mb-4">
            <Button variant="outline" onClick={() => runCleanup(true)} disabled={cleanupLoading}>
              <Search className="h-4 w-4" />
              {cleanupLoading ? "Scanning..." : "Dry Run (Scan Only)"}
            </Button>
            <Button variant="danger" onClick={() => runCleanup(false)} disabled={cleanupLoading}>
              <Trash2 className="h-4 w-4" />
              {cleanupLoading ? "Cleaning..." : "Delete Orphaned Files"}
            </Button>
          </div>

          {cleanupError && (
            <Alert variant="error">{cleanupError}</Alert>
          )}

          {cleanupResult && (
            <div className="space-y-3">
              <Alert variant={cleanupResult.dryRun ? "info" : "success"}>
                {cleanupResult.dryRun
                  ? `Dry run complete. Found ${cleanupResult.orphanedFiles.length} orphaned file(s).`
                  : `Cleanup complete. Deleted ${cleanupResult.deletedCount} orphaned folder(s).`}
              </Alert>
              {cleanupResult.orphanedFiles.length > 0 && (
                <div className="rounded-lg border bg-gray-50 p-3 max-h-48 overflow-y-auto">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Orphaned paths:</p>
                  {cleanupResult.orphanedFiles.map((f, i) => (
                    <p key={i} className="text-xs font-mono text-gray-700">{f}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-8 flex gap-3">
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4" />
            Back to App
          </Button>
        </Link>
        <Button variant="danger" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
