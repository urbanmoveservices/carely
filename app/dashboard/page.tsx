"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { AppHeader } from "@/components/AppHeader";
import { MobileShell } from "@/components/MobileShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardDocuments } from "@/components/DashboardDocuments";
import { TodayHealthTasks } from "@/components/reminders/TodayHealthTasks";
import { DashboardInsights } from "@/components/insights/DashboardInsights";
import { DashboardRiskCards } from "@/components/dashboard/DashboardRiskCards";
import { DashboardSuggestedFollowups } from "@/components/dashboard/DashboardSuggestedFollowups";
import { subscribeDashboardRefresh } from "@/lib/dashboard-events";
import { MonthlyUsageCard } from "@/components/dashboard/MonthlyUsageCard";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { OnboardingSetupCard } from "@/components/dashboard/OnboardingSetupCard";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api-client";
import type { DocumentItem } from "@/types";
import type { FamilyMember } from "@/types";
import { useTranslation } from "@/lib/i18n/use-translation";
import {
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  ScanText,
  Users,
  Plus,
  Search,
  Lightbulb,
  TrendingUp,
  GitCompare,
  MessageCircle,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const { t, tParams } = useTranslation();
  const [searchQ, setSearchQ] = useState("");
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshOverview = (showLoading = false) => {
    if (showLoading) setLoading(true);
    return Promise.all([
      api.get<DocumentItem[]>("/api/documents").catch(() => [] as DocumentItem[]),
      api.getFamilyMembers().catch(() => [] as FamilyMember[]),
    ])
      .then(([d, f]) => {
        setDocs(d);
        setFamily(f);
      })
      .finally(() => {
        if (showLoading) setLoading(false);
      });
  };

  useEffect(() => {
    refreshOverview(true);
    const toast = typeof window !== "undefined"
      ? window.sessionStorage.getItem("carely-dashboard-toast")
      : null;
    if (toast) {
      window.sessionStorage.removeItem("carely-dashboard-toast");
    }
    return subscribeDashboardRefresh(() => refreshOverview(false));
  }, []);

  const total = docs.length;
  const textExtracted = docs.filter(
    (d) => d.upload_status === "text_extracted"
  ).length;
  const aiCompleted = docs.filter(
    (d) => d.upload_status === "ai_completed"
  ).length;
  const processing = docs.filter(
    (d) => d.upload_status === "processing" || d.upload_status === "uploaded"
  ).length;
  const failed = docs.filter((d) => d.upload_status === "failed").length;

  const statItems = [
    { label: t("dashboard.statTotal"), value: total, icon: FileText, color: "text-gray-600" },
    { label: t("dashboard.statExtracted"), value: textExtracted, icon: ScanText, color: "text-blue-600" },
    { label: t("dashboard.statAiDone"), value: aiCompleted, icon: CheckCircle2, color: "text-green-600" },
    { label: t("dashboard.statInProgress"), value: processing, icon: Clock, color: "text-amber-600" },
    { label: t("dashboard.statFailed"), value: failed, icon: AlertCircle, color: "text-red-500" },
  ];

  return (
    <MobileShell>
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8 sm:px-6 lg:px-8">
        {user?.isDemo && (
          <Badge variant="warning" className="mb-4">
            Demo account — sample data only
          </Badge>
        )}
        <EmailVerificationBanner />
        <OnboardingSetupCard />
        <MonthlyUsageCard />
        {/* Greeting card */}
        <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-5 sm:p-6 text-white mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">
                {tParams("dashboard.greeting", { name: user?.name || "" })}
              </h1>
              <p className="text-brand-100 text-sm mt-1">
                {t("dashboard.subtitle")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/chat">
                <Button
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 bg-white/10"
                >
                  <MessageCircle className="h-4 w-4" />
                  Ask Vaidya GPT
                </Button>
              </Link>
              <Link href="/upload">
                <Button
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 bg-white/10"
                >
                  <Upload className="h-4 w-4" />
                  {t("dashboard.uploadReport")}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <form
          className="mb-4 relative"
          onSubmit={(e) => {
            e.preventDefault();
            if (searchQ.trim()) router.push(`/search?q=${encodeURIComponent(searchQ.trim())}`);
          }}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder={t("dashboard.searchPlaceholder")}
            className="pl-10 min-h-[48px] rounded-2xl"
          />
        </form>

        <DashboardInsights />
        <DashboardRiskCards />
        <DashboardSuggestedFollowups />
        <TodayHealthTasks />

        {/* Family summary */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm mb-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-brand-50 p-2.5">
                <Users className="h-5 w-5 text-brand-700" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">{t("dashboard.familyHealth")}</h2>
                <p className="text-sm text-gray-500">
                  {family.length === 1
                    ? tParams("dashboard.memberCount", { count: String(family.length) })
                    : tParams("dashboard.memberCountPlural", { count: String(family.length) })}{" "}
                  ·{" "}
                  {tParams("dashboard.linkedReports", {
                    count: String(docs.filter((d) => d.family_member).length),
                  })}
                </p>
              </div>
            </div>
            <Link href="/family">
              <Button variant="outline" size="sm" className="min-h-[44px]">
                {t("dashboard.manageFamily")}
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <Link href="/upload">
              <Button size="sm" className="min-h-[44px]">
                <Upload className="h-4 w-4" /> {t("dashboard.uploadReport")}
              </Button>
            </Link>
            <Link href="/family/new">
              <Button variant="outline" size="sm" className="min-h-[44px]">
                <Plus className="h-4 w-4" /> {t("dashboard.addFamilyMember")}
              </Button>
            </Link>
            <Link href="/family">
              <Button variant="outline" size="sm" className="min-h-[44px]">
                {t("dashboard.viewFamily")}
              </Button>
            </Link>
            <Link href="/insights">
              <Button variant="outline" size="sm" className="min-h-[44px]">
                <Lightbulb className="h-4 w-4" /> {t("common.insights")}
              </Button>
            </Link>
          </div>
        </div>

        {family.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <Link href="/insights">
              <Button variant="outline" size="sm" className="min-h-[40px]">
                <TrendingUp className="h-4 w-4" /> {t("dashboard.healthTrends")}
              </Button>
            </Link>
            {family[0] && (
              <Link href={`/family/${family[0].id}/compare-reports`}>
                <Button variant="outline" size="sm" className="min-h-[40px]">
                  <GitCompare className="h-4 w-4" /> {t("dashboard.compareReports")}
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Status cards — horizontal scroll on mobile */}
        {loading ? (
          <div className="flex gap-3 overflow-x-auto pb-2 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 min-w-[130px] sm:min-w-0 flex-shrink-0 sm:flex-shrink rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-5 scrollbar-none">
            {statItems.map(({ label, value, icon: Icon, color }) => (
              <div
                key={label}
                className="min-w-[120px] sm:min-w-0 flex-shrink-0 sm:flex-shrink rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-4 w-4 ${color}`} />
                  <span className="text-xs text-gray-500 font-medium">
                    {label}
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Recent uploads */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("dashboard.recentUploads")}
          </h2>
        </div>
        <DashboardDocuments />
      </main>
    </MobileShell>
  );
}
