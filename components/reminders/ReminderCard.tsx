"use client";

import Link from "next/link";
import type { Reminder } from "@/types";
import { ReminderStatusBadge } from "./ReminderStatusBadge";
import { formatRelation } from "@/lib/family-utils";
import { Button } from "@/components/ui/Button";
import {
  Bell,
  Pill,
  Calendar,
  Activity,
  CheckCircle,
  SkipForward,
  Pencil,
  Trash2,
  Clock,
} from "lucide-react";

const TYPE_ICONS = {
  medication: Pill,
  appointment: Calendar,
  vital: Activity,
  custom: Bell,
};

interface ReminderCardProps {
  reminder: Reminder;
  onDone: (id: string) => void;
  onSkip: (id: string) => void;
  onDelete: (id: string) => void;
  busy?: boolean;
}

export function ReminderCard({
  reminder,
  onDone,
  onSkip,
  onDelete,
  busy,
}: ReminderCardProps) {
  const Icon = TYPE_ICONS[reminder.type] || Bell;
  const isPending = reminder.status === "pending";

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 truncate">{reminder.title}</h3>
            <ReminderStatusBadge status={reminder.status} />
          </div>
          {reminder.description && (
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{reminder.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {new Date(reminder.scheduledAt).toLocaleString()}
            </span>
            {reminder.repeatType !== "none" && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 capitalize">
                {reminder.repeatType}
              </span>
            )}
            {reminder.familyMember && (
              <span className="rounded-full bg-brand-50 text-brand-800 px-2 py-0.5 truncate max-w-[140px]">
                {formatRelation(reminder.familyMember.relation)} · {reminder.familyMember.fullName}
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {isPending && (
              <>
                <Button
                  size="sm"
                  className="min-h-[44px] flex-1 sm:flex-none"
                  disabled={busy}
                  onClick={() => onDone(reminder.id)}
                >
                  <CheckCircle className="h-4 w-4" /> Done
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-[44px]"
                  disabled={busy}
                  onClick={() => onSkip(reminder.id)}
                >
                  <SkipForward className="h-4 w-4" /> Skip
                </Button>
              </>
            )}
            <Link href={`/reminders/${reminder.id}/edit`}>
              <Button size="sm" variant="outline" className="min-h-[44px]">
                <Pencil className="h-4 w-4" />
              </Button>
            </Link>
            <button
              type="button"
              onClick={() => onDelete(reminder.id)}
              disabled={busy}
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 min-h-[44px] text-red-600 active:bg-red-50"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
