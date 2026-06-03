"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import type { ReminderSuggestionItem } from "@/types";

export function FamilyMemberFollowupsPanel({ memberId }: { memberId: string }) {
  const [items, setItems] = useState<ReminderSuggestionItem[]>([]);

  const load = () => {
    api
      .getReminderSuggestions(`familyMemberId=${memberId}&status=pending`)
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  };

  useEffect(() => {
    load();
  }, [memberId]);

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-6 text-center">
        No suggested follow-ups for this member.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((s) => (
        <li key={s.id} className="rounded-xl bg-gray-50 p-3">
          <p className="font-medium text-sm">{s.title}</p>
          <p className="text-xs text-gray-600 mt-1">{s.message}</p>
          <Button size="sm" className="mt-2" onClick={() => api.acceptReminderSuggestion(s.id).then(load)}>
            Accept
          </Button>
        </li>
      ))}
    </ul>
  );
}
