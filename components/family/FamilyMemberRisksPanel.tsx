"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import type { HealthRiskCard } from "@/types";
import { Badge } from "@/components/ui/Badge";

export function FamilyMemberRisksPanel({ memberId }: { memberId: string }) {
  const [cards, setCards] = useState<HealthRiskCard[]>([]);

  useEffect(() => {
    api
      .getHealthRisks(`familyMemberId=${memberId}&status=active&limit=20`)
      .then((r) =>
        setCards(r.cards.filter((c) => !c.id.startsWith("pending-") && !c.id.startsWith("no-vitals")))
      )
      .catch(() => setCards([]));
  }, [memberId]);

  if (cards.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-6 text-center">
        No active health risks for this member.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {cards.map((c) => (
        <li key={c.id} className="rounded-xl border border-gray-100 p-3">
          <div className="flex justify-between gap-2">
            <span className="font-medium text-sm">{c.title}</span>
            <Badge variant={c.level === "critical" ? "critical" : c.level === "warning" ? "warning" : "default"}>
              {c.level}
            </Badge>
          </div>
          <p className="text-xs text-gray-600 mt-1">{c.message}</p>
          {c.reportId && (
            <Link href={`/reports/${c.reportId}`} className="text-xs text-brand-600 mt-2 inline-block">
              View report
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
