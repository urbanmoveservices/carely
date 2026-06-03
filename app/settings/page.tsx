"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { AppHeader } from "@/components/AppHeader";
import { MobileShell } from "@/components/MobileShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Alert } from "@/components/ui/Alert";
import {
  User,
  Mail,
  Shield,
  LogOut,
  Save,
  Lock,
  Eye,
  EyeOff,
  Users,
  Plus,
  Calendar,
  AlertTriangle,
  Bell,
  CreditCard,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import type { FamilyMember, UserPreference } from "@/types";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTranslation } from "@/lib/i18n/use-translation";
import { usePreferencesActions } from "@/components/PreferencesProvider";
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  GENERIC_REMINDER_NOTIFICATION_BODY,
} from "@/lib/notification-permission";

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}

function SettingsContent() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { refreshPreferences } = usePreferencesActions();

  const [name, setName] = useState(user?.name || "");
  const [profileMsg, setProfileMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  const [familyCount, setFamilyCount] = useState(0);
  const [notifPermission, setNotifPermission] = useState("unsupported");
  const [notifLoading, setNotifLoading] = useState(false);
  const [prefs, setPrefs] = useState<UserPreference | null>(null);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
    api.getPreferences().then(setPrefs).catch(() => {});
  }, []);

  useEffect(() => {
    api
      .get<FamilyMember[]>("/api/family-members")
      .then((members) => setFamilyCount(members.length))
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    if (name.trim().length < 2) {
      setProfileMsg({
        type: "error",
        text: "Name must be at least 2 characters",
      });
      return;
    }
    setProfileLoading(true);
    try {
      await api.patch("/api/auth/profile", { name: name.trim() });
      setProfileMsg({ type: "success", text: "Profile updated successfully" });
      if (refreshUser) refreshUser();
    } catch (err: any) {
      setProfileMsg({
        type: "error",
        text: err.message || "Failed to update profile",
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (newPassword.length < 8) {
      setPwMsg({
        type: "error",
        text: "New password must be at least 8 characters",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: "error", text: "New passwords do not match" });
      return;
    }
    setPwLoading(true);
    try {
      await api.post("/api/auth/change-password", {
        currentPassword,
        newPassword,
      });
      setPwMsg({ type: "success", text: "Password changed successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPwMsg({
        type: "error",
        text: err.message || "Failed to change password",
      });
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <MobileShell>
      <AppHeader />
      <main className="mx-auto max-w-lg px-4 py-6 sm:py-10">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
          {t("settings.title")}
        </h1>

        <div className="space-y-5">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              {t("settings.language")}
            </h2>
            <LanguageSelector />
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              AI Translation Privacy
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              To translate report summaries and medical content, Vaidya GPT
              may send selected text to OpenAI for translation. Do not use this with
              sensitive real data unless you accept.
            </p>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300"
                checked={prefs?.allowCloudTranslation ?? false}
                disabled={prefsSaving}
                onChange={async (e) => {
                  setPrefsSaving(true);
                  try {
                    const updated = await api.updatePreferences({
                      allowCloudTranslation: e.target.checked,
                    });
                    setPrefs(updated);
                    await refreshPreferences();
                  } catch {
                    /* ignore */
                  } finally {
                    setPrefsSaving(false);
                  }
                }}
              />
              <span className="text-sm text-gray-800">
                Allow AI translation of medical content
              </span>
            </label>
          </div>
          {user?.isDemo && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Demo account — all data is sample/fake for testing only.
            </div>
          )}

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile & Patient Details
            </h2>
            <p className="text-sm text-gray-600 mb-3">
              Update your name, phone number, gender, blood group, address, and emergency
              contact.
            </p>
            <p className="text-xs text-gray-500 mb-3">
              Billing profile:{" "}
              <Badge variant={user?.billingProfileCompleted ? "success" : "warning"}>
                {user?.billingProfileCompleted ? "Complete" : "Incomplete"}
              </Badge>
              {!user?.billingProfileCompleted && (
                <span className="block mt-1">Required for Razorpay payments.</span>
              )}
            </p>
            <Link href="/settings/profile">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                Edit Profile
              </Button>
            </Link>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Plan & Billing
            </h2>
            <p className="text-sm text-gray-600 mb-3">
              Current plan:{" "}
              <Badge variant="info">{user?.currentPlan || "free"}</Badge>
            </p>
            <Link href="/billing">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                Manage Billing
              </Button>
            </Link>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Email verification</h2>
            <p className="text-sm text-gray-600 mb-3">
              Status:{" "}
              {user?.emailVerified ? (
                <Badge variant="success">Verified</Badge>
              ) : (
                <Badge variant="warning">Not verified</Badge>
              )}
            </p>
            {!user?.emailVerified && (
              <>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    loading={verifyLoading}
                    onClick={async () => {
                      setVerifyLoading(true);
                      try {
                        const res = await api.sendEmailVerificationCode();
                        setVerifyMsg(res.message);
                      } catch (e: unknown) {
                        setVerifyMsg(e instanceof Error ? e.message : "Failed");
                      } finally {
                        setVerifyLoading(false);
                      }
                    }}
                  >
                    Send verification code
                  </Button>
                  <Link href="/verify-email">
                    <Button size="sm" variant="outline">
                      Enter code
                    </Button>
                  </Link>
                </div>
                {verifyMsg && (
                  <p className="text-xs text-gray-500 mt-2">{verifyMsg}</p>
                )}
              </>
            )}
          </div>

          {/* Profile overview */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              Profile Overview
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gray-100 p-2">
                  <User className="h-4 w-4 text-gray-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Name</p>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gray-100 p-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gray-100 p-2">
                  <Shield className="h-4 w-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Role</p>
                  <Badge variant={user?.role === "admin" ? "admin" : "user"}>
                    {user?.role}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gray-100 p-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Joined</p>
                  <p className="text-sm font-medium text-gray-900">
                    {user?.createdAt ? formatDate(user.createdAt) : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Edit profile */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              Edit Profile
            </h2>
            {profileMsg && (
              <Alert
                variant={profileMsg.type === "success" ? "success" : "error"}
                className="mb-4"
              >
                {profileMsg.text}
              </Alert>
            )}
            <form onSubmit={handleProfileUpdate} className="space-y-3">
              <div>
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="h-11"
                />
              </div>
              <Button type="submit" disabled={profileLoading} className="h-11">
                <Save className="h-4 w-4" />
                {profileLoading ? "Saving..." : "Update Name"}
              </Button>
            </form>
          </div>

          {/* Change password */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              Change Password
            </h2>
            {pwMsg && (
              <Alert
                variant={pwMsg.type === "success" ? "success" : "error"}
                className="mb-4"
              >
                {pwMsg.text}
              </Alert>
            )}
            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div className="relative">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type={showCurrentPw ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showCurrentPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div className="relative">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type={showNewPw ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showNewPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="h-11"
                />
              </div>
              <Button type="submit" disabled={pwLoading} className="h-11">
                <Lock className="h-4 w-4" />
                {pwLoading ? "Changing..." : "Change Password"}
              </Button>
            </form>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Accessibility</h2>
            <p className="text-xs text-gray-500 mb-4">Senior-friendly mode: larger text, buttons, and higher contrast.</p>
            {prefs && (
              <div className="space-y-3">
                <label className="flex items-center justify-between text-sm min-h-[44px]">
                  <span>Senior mode</span>
                  <input
                    type="checkbox"
                    checked={prefs.seniorMode}
                    onChange={async (e) => {
                      setPrefsSaving(true);
                      const u = await api.updatePreferences({ seniorMode: e.target.checked });
                      setPrefs(u);
                      setPrefsSaving(false);
                    }}
                  />
                </label>
                <div>
                  <Label>Font size</Label>
                  <select
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm min-h-[44px]"
                    value={prefs.fontScale}
                    onChange={async (e) => {
                      const u = await api.updatePreferences({
                        fontScale: e.target.value as UserPreference["fontScale"],
                      });
                      setPrefs(u);
                    }}
                  >
                    <option value="normal">Normal</option>
                    <option value="large">Large</option>
                    <option value="extra_large">Extra large</option>
                  </select>
                </div>
                <label className="flex items-center justify-between text-sm min-h-[44px]">
                  <span>High contrast</span>
                  <input
                    type="checkbox"
                    checked={prefs.highContrast}
                    onChange={async (e) => {
                      const u = await api.updatePreferences({ highContrast: e.target.checked });
                      setPrefs(u);
                    }}
                  />
                </label>
                <label className="flex items-center justify-between text-sm min-h-[44px]">
                  <span>Reduce motion</span>
                  <input
                    type="checkbox"
                    checked={prefs.reduceMotion}
                    onChange={async (e) => {
                      const u = await api.updatePreferences({ reduceMotion: e.target.checked });
                      setPrefs(u);
                    }}
                  />
                </label>
              </div>
            )}
            {prefsSaving && <p className="text-xs text-gray-400">Saving…</p>}
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Data &amp; Insights</h2>
            <p className="text-xs text-gray-500 mb-4">
              Search your records and view rule-based health insights from your saved data. Not a final diagnosis—confirm with your doctor.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/search">
                <Button variant="outline" size="sm" className="min-h-[44px]">
                  Search data
                </Button>
              </Link>
              <Link href="/insights">
                <Button variant="outline" size="sm" className="min-h-[44px]">
                  View insights
                </Button>
              </Link>
              <Link href="/sharing">
                <Button variant="outline" size="sm" className="min-h-[44px]">
                  Sharing
                </Button>
              </Link>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Reminder notifications should not expose medical details on lock screens.
            </p>
          </div>

          {/* Notification preferences */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Bell className="h-4 w-4 text-brand-600" />
              Notification preferences
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              Browser push notifications are coming soon. In-app reminders are
              available now on the Reminders page.
            </p>
            <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2 mb-3">
              Future alerts will use generic text only (e.g. &quot;
              {GENERIC_REMINDER_NOTIFICATION_BODY}&quot;) — no medical details on
              lock screens.
            </p>
            <p className="text-sm text-gray-700 mb-3">
              Status:{" "}
              <span className="font-medium capitalize">{notifPermission}</span>
            </p>
            {isNotificationSupported() ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-[44px]"
                disabled={notifLoading || notifPermission === "granted"}
                onClick={async () => {
                  setNotifLoading(true);
                  const result = await requestNotificationPermission();
                  setNotifPermission(result);
                  try {
                    await api.post("/api/notifications/permission-request", {
                      permission: result,
                    });
                  } catch {}
                  setNotifLoading(false);
                }}
              >
                {notifLoading
                  ? "Requesting…"
                  : notifPermission === "granted"
                    ? "Permission granted"
                    : "Request notification permission"}
              </Button>
            ) : (
              <p className="text-xs text-gray-500">Not supported in this browser.</p>
            )}
          </div>

          {/* Family management */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Family Management
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              {familyCount === 0
                ? "No family members added yet."
                : `${familyCount} family member${familyCount > 1 ? "s" : ""} added.`}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/family">
                <Button variant="outline" size="sm">
                  <Users className="h-4 w-4" />
                  Manage Family
                </Button>
              </Link>
              <Link href="/family/new">
                <Button variant="ghost" size="sm">
                  <Plus className="h-4 w-4" />
                  Add Member
                </Button>
              </Link>
            </div>
          </div>

          {/* Account & Privacy */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Account & Privacy
            </h2>
            <div className="space-y-2 text-xs text-gray-500 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                <p>Medical data is stored securely and accessible only to you. Reports and PDFs are private.</p>
              </div>
              <div className="flex items-start gap-2">
                <Shield className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                <p>Operated by UrbanMove Services Private Limited.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-sm mb-3">
              <Link href="/settings/data">
                <Button variant="outline" size="sm">
                  Export & delete data
                </Button>
              </Link>
              <Link href="/settings/security">
                <Button variant="outline" size="sm">
                  Security & access logs
                </Button>
              </Link>
              <Link href="/jobs">
                <Button variant="outline" size="sm">
                  Background jobs
                </Button>
              </Link>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Link href="/consent">
                <Button variant="outline" size="sm">
                  Consent & Data Use
                </Button>
              </Link>
              <Link href="/privacy">
                <Button variant="ghost" size="sm">
                  Privacy
                </Button>
              </Link>
              <Link href="/terms">
                <Button variant="ghost" size="sm">
                  Terms
                </Button>
              </Link>
              <Link href="/disclaimer">
                <Button variant="ghost" size="sm">
                  Disclaimer
                </Button>
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                await api.resetOnboarding();
                router.push("/onboarding");
              }}
            >
              Restart onboarding
            </Button>
          </div>

          {/* Danger zone */}
          <div className="rounded-2xl border border-red-100 bg-white p-5 space-y-3">
            <Button
              variant="danger"
              onClick={handleLogout}
              className="w-full h-11"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
            <Link href="/settings/data" className="block">
              <Button variant="outline" className="w-full h-11">
                Manage data & account deletion
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </MobileShell>
  );
}
