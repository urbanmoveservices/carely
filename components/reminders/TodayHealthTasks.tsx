"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import type { HealthTodayResponse } from "@/types";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Bell,
  Calendar,
  FileText,
  Sparkles,
  Plus,
  Upload,
  Activity,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/use-translation";

export function TodayHealthTasks() {
  const { t } = useTranslation();
  const [data, setData] = useState<HealthTodayResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getHealthToday()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3 mb-6">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  if (!data) return null;

  const { stats } = data;

  const statItems = [
    { label: t("dashboard.pending"), value: stats.pendingReminders, icon: Bell },
    { label: t("dashboard.doneToday"), value: stats.completedToday, icon: Sparkles },
    { label: t("dashboard.visits"), value: stats.upcomingAppointments, icon: Calendar },
    {
      label: t("dashboard.aiSummary"),
      value: stats.reportsAwaitingSummary,
      icon: FileText,
    },
  ];

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900">
          {t("dashboard.todayHealthTasks")}
        </h2>
        <Link href="/reminders">
          <Button variant="ghost" size="sm" className="relative min-h-[44px]">
            <Bell className="h-4 w-4" />
            {t("dashboard.reminders")}
            {stats.pendingReminders > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {stats.pendingReminders > 9 ? "9+" : stats.pendingReminders}
              </span>
            )}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {statItems.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-xl border border-gray-100 bg-white p-3 text-center shadow-sm"
          >
            <Icon className="h-4 w-4 text-brand-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-900">{value}</p>
            <p className="text-[10px] text-gray-500 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
        {data.todayReminders.length > 0 ? (
          <ul className="space-y-2">
            {data.todayReminders.slice(0, 4).map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-2 text-sm rounded-lg bg-gray-50 px-3 py-2 min-h-[44px]"
              >
                <span className="truncate font-medium">{r.title}</span>
                <span className="text-xs text-gray-500 shrink-0">
                  {new Date(r.scheduledAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">{t("dashboard.noRemindersToday")}</p>
        )}

        {data.pendingReports.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
              {t("dashboard.reportsAwaitingSummary")}
            </p>
            <ul className="space-y-2">
              {data.pendingReports.slice(0, 3).map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/documents/${d.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 min-h-[44px] text-sm"
                  >
                    <span className="truncate text-amber-900">{d.original_filename}</span>
                    <span className="text-xs font-medium text-amber-700 shrink-0 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" /> {t("dashboard.generate")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Link href="/reminders/new">
            <Button size="sm" className="min-h-[44px]">
              <Plus className="h-4 w-4" /> {t("dashboard.addReminder")}
            </Button>
          </Link>
          <Link href="/upload">
            <Button size="sm" variant="outline" className="min-h-[44px]">
              <Upload className="h-4 w-4" /> {t("dashboard.upload")}
            </Button>
          </Link>
          <Link href="/family">
            <Button size="sm" variant="outline" className="min-h-[44px]">
              <Activity className="h-4 w-4" /> {t("dashboard.addVital")}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
