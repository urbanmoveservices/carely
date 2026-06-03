"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert } from "@/components/ui/Alert";
import { adminApi } from "@/lib/admin-api-client";
import { formatDate, formatBytes } from "@/lib/utils";
import type { AdminUserDetail, User } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { ArrowLeft, User as UserIcon, Mail, Shield, FileText, ClipboardList, Clock, Power, Languages } from "lucide-react";
import { getLanguageDisplayName } from "@/lib/i18n/languages";

export default function AdminUserDetailPage() {
  return (
    <AdminLayout>
      {(admin) => <AdminUserDetailContent admin={admin} />}
    </AdminLayout>
  );
}

function AdminUserDetailContent({ admin }: { admin: User }) {
  const params = useParams();
  const userId = params.id as string;
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roleLoading, setRoleLoading] = useState(false);

  useEffect(() => {
    adminApi
      .get<AdminUserDetail>(`/api/admin/users/${userId}`)
      .then(setUser)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleRoleChange = async (newRole: string) => {
    if (!user) return;
    setRoleLoading(true);
    try {
      await adminApi.patch(`/api/admin/users/${userId}/role`, { role: newRole });
      setUser({ ...user, role: newRole });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRoleLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <AdminHeader title="User Details" user={admin} />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div>
        <AdminHeader title="User Details" user={admin} />
        <Alert variant="error">{error || "User not found"}</Alert>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Link>
      </div>
      <AdminHeader title={user.name} description={user.email} user={admin} />

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <UserIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Name</p>
                  <p className="font-medium">{user.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Languages className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Preferred language</p>
                  <p className="font-medium text-sm">
                    {getLanguageDisplayName(user.language || "en")}
                  </p>
                </div>
              </div>
              {user.phoneNumber && (
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="font-medium text-sm">{user.phoneNumber}</p>
                </div>
              )}
              {(user.gender || user.bloodGroup) && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {user.gender && (
                    <div>
                      <p className="text-xs text-gray-500">Gender</p>
                      <p className="font-medium capitalize">{user.gender.replace(/_/g, " ")}</p>
                    </div>
                  )}
                  {user.bloodGroup && (
                    <div>
                      <p className="text-xs text-gray-500">Blood group</p>
                      <p className="font-medium">{user.bloodGroup}</p>
                    </div>
                  )}
                </div>
              )}
              {(user.age != null || user.dateOfBirth) && (
                <div>
                  <p className="text-xs text-gray-500">Age / DOB</p>
                  <p className="font-medium text-sm">
                    {user.age != null ? `${user.age} years` : "—"}
                    {user.dateOfBirth ? ` · ${user.dateOfBirth}` : ""}
                  </p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Badge variant={user.billingProfileCompleted ? "success" : "warning"}>
                  Billing {user.billingProfileCompleted ? "complete" : "incomplete"}
                </Badge>
                <Badge variant={user.medicalProfileCompleted ? "success" : "warning"}>
                  Medical {user.medicalProfileCompleted ? "complete" : "incomplete"}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Role</p>
                  <Badge variant={user.role === "admin" ? "admin" : "user"}>
                    {user.role}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Power className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <Badge variant={user.isActive ? "success" : "error"}>
                    {user.isActive ? "Active" : "Disabled"}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Last Login</p>
                  <p className="font-medium text-sm">
                    {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"}
                  </p>
                </div>
              </div>
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Change Role</p>
                <div className="flex gap-2">
                  <Button
                    variant={user.role === "user" ? "primary" : "outline"}
                    size="sm"
                    loading={roleLoading}
                    onClick={() => handleRoleChange("user")}
                    disabled={user.role === "user" || user.id === admin.id}
                  >
                    User
                  </Button>
                  <Button
                    variant={user.role === "admin" ? "primary" : "outline"}
                    size="sm"
                    loading={roleLoading}
                    onClick={() => handleRoleChange("admin")}
                    disabled={user.role === "admin" || user.id === admin.id}
                  >
                    Admin
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents ({user.documents.length})
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user.documents.length === 0 ? (
              <p className="text-sm text-gray-500">No documents uploaded</p>
            ) : (
              <div className="space-y-2">
                {user.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {doc.originalFilename}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatBytes(doc.fileSize)} &middot;{" "}
                        {formatDate(doc.createdAt)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        (doc.uploadStatus as
                          | "uploaded"
                          | "processing"
                          | "completed"
                          | "failed") || "default"
                      }
                    >
                      {doc.uploadStatus}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {user.familyMembers && user.familyMembers.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Family Members ({user.familyMembers.length})
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {user.familyMembers.map((m: any) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{m.fullName}</p>
                    <p className="text-xs text-gray-500 capitalize">{m.relation}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end">
                    <Badge variant="default">{m.documentCount} docs</Badge>
                    {m.conditionCount != null && (
                      <Badge variant="warning">{m.conditionCount} cond.</Badge>
                    )}
                    {m.medicationCount != null && (
                      <Badge variant="info">{m.medicationCount} meds</Badge>
                    )}
                    {m.appointmentCount != null && (
                      <Badge variant="default">{m.appointmentCount} appts</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Reports ({user.reports.length})
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user.reports.length === 0 ? (
            <p className="text-sm text-gray-500">No reports generated</p>
          ) : (
            <div className="space-y-2">
              {user.reports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-lg bg-gray-50 p-3"
                >
                  <p className="text-sm font-medium">Report {report.id.slice(0, 8)}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(report.createdAt)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {report.summary}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
