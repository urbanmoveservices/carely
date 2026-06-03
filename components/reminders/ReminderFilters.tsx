"use client";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/use-translation";

export type ReminderFilterTab = "today" | "upcoming" | "done" | "skipped" | "all";

const TAB_KEYS: { id: ReminderFilterTab; key: string }[] = [
  { id: "today", key: "reminders.today" },
  { id: "upcoming", key: "reminders.upcoming" },
  { id: "done", key: "reminders.done" },
  { id: "skipped", key: "reminders.skipped" },
  { id: "all", key: "reminders.all" },
];

export function ReminderFilters({
  active,
  onChange,
}: {
  active: ReminderFilterTab;
  onChange: (tab: ReminderFilterTab) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-1 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
      {TAB_KEYS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "shrink-0 rounded-full px-4 py-2 text-sm font-medium min-h-[44px] transition-colors",
            active === tab.id
              ? "bg-brand-600 text-white"
              : "bg-gray-100 text-gray-600 active:bg-gray-200"
          )}
        >
          {t(tab.key)}
        </button>
      ))}
    </div>
  );
}
