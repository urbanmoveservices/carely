"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { ReminderCard } from "@/components/reminders/ReminderCard";
import { Button } from "@/components/ui/Button";
import type { Reminder } from "@/types";
import { Plus } from "lucide-react";

export function FamilyRemindersList({ memberId }: { memberId: string }) {
  const [items, setItems] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .getReminders(`familyMemberId=${memberId}&scope=all&limit=50`)
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false));
  }, [memberId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="text-sm text-gray-500">Loading reminders…</p>;

  return (
    <div className="space-y-4">
      <Link href={`/reminders/new?familyMemberId=${memberId}`}>
        <Button size="sm" className="min-h-[44px]">
          <Plus className="h-4 w-4" /> Add reminder
        </Button>
      </Link>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No reminders for this member.</p>
      ) : (
        items.map((r) => (
          <ReminderCard
            key={r.id}
            reminder={r}
            busy={busyId === r.id}
            onDone={async (id) => {
              setBusyId(id);
              await api.updateReminderStatus(id, "done");
              load();
              setBusyId(null);
            }}
            onSkip={async (id) => {
              setBusyId(id);
              await api.updateReminderStatus(id, "skipped");
              load();
              setBusyId(null);
            }}
            onDelete={async (id) => {
              if (!confirm("Delete reminder?")) return;
              setBusyId(id);
              await api.deleteReminder(id);
              load();
              setBusyId(null);
            }}
          />
        ))
      )}
    </div>
  );
}
