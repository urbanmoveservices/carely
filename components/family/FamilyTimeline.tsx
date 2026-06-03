"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { FamilyTimelineItem } from "@/types";
import {
  FileText,
  Sparkles,
  Activity,
  Pill,
  Calendar,
  AlertCircle,
} from "lucide-react";

const ICONS: Record<string, typeof FileText> = {
  document_uploaded: FileText,
  report_generated: Sparkles,
  ai_summary_generated: Sparkles,
  risk_detected: AlertCircle,
  lab_trends_extracted: Activity,
  condition_added: AlertCircle,
  allergy_added: AlertCircle,
  medication_started: Pill,
  vital_added: Activity,
  appointment_created: Calendar,
};

export function FamilyTimeline({ memberId }: { memberId: string }) {
  const [items, setItems] = useState<FamilyTimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getFamilyMemberTimeline(memberId)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [memberId]);

  if (loading) return <p className="text-sm text-gray-500">Loading timeline…</p>;
  if (items.length === 0) {
    return <p className="text-sm text-gray-500 py-6 text-center">No timeline events yet.</p>;
  }

  return (
    <ul className="relative border-l-2 border-brand-100 ml-3 space-y-4 pl-6">
      {items.map((item) => {
        const Icon = ICONS[item.type] || FileText;
        return (
          <li key={item.id} className="relative">
            <span className="absolute -left-[1.65rem] flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <Icon className="h-4 w-4" />
            </span>
            <div className="rounded-xl border border-gray-100 bg-white p-3">
              <p className="font-medium text-gray-900 text-sm">{item.title}</p>
              {item.subtitle && (
                <p className="text-xs text-gray-500 mt-0.5">{item.subtitle}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {new Date(item.occurredAt).toLocaleString()}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
