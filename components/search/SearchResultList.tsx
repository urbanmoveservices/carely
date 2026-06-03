"use client";

import Link from "next/link";
import type { SearchResultItem, SearchResultsGroup } from "@/types";
import { Badge } from "@/components/ui/Badge";
import {
  FileText,
  Sparkles,
  Users,
  Pill,
  Calendar,
  Bell,
  Activity,
  AlertCircle,
} from "lucide-react";

const ICONS: Record<string, typeof FileText> = {
  document: FileText,
  report: Sparkles,
  family: Users,
  condition: AlertCircle,
  allergy: AlertCircle,
  medication: Pill,
  appointment: Calendar,
  reminder: Bell,
  vital: Activity,
};

const GROUPS: { key: keyof SearchResultsGroup; label: string }[] = [
  { key: "reports", label: "Reports" },
  { key: "documents", label: "Documents" },
  { key: "familyMembers", label: "Family" },
  { key: "medications", label: "Medications" },
  { key: "conditions", label: "Conditions & allergies" },
  { key: "vitals", label: "Vitals" },
  { key: "appointments", label: "Appointments" },
  { key: "reminders", label: "Reminders" },
];

export function SearchResultList({ results }: { results: SearchResultsGroup }) {
  let hasAny = false;
  return (
    <div className="space-y-6">
      {GROUPS.map(({ key, label }) => {
        const items = results[key];
        if (!items?.length) return null;
        hasAny = true;
        return (
          <section key={key}>
            <h2 className="text-sm font-semibold text-gray-900 mb-2">{label}</h2>
            <ul className="space-y-2">
              {items.map((item) => (
                <SearchResultCard key={`${item.type}-${item.id}`} item={item} />
              ))}
            </ul>
          </section>
        );
      })}
      {!hasAny && (
        <p className="text-center text-sm text-gray-500 py-8">No results found</p>
      )}
    </div>
  );
}

function SearchResultCard({ item }: { item: SearchResultItem }) {
  const Icon = ICONS[item.type] || FileText;
  return (
    <li>
      <Link
        href={item.href}
        className="flex gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm active:bg-gray-50 min-h-[56px]"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 truncate text-sm">{item.title}</p>
          {item.subtitle && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{item.subtitle}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-1">
            <Badge variant="default" className="text-[10px] capitalize">
              {item.type}
            </Badge>
            {item.date && (
              <span className="text-[10px] text-gray-400">
                {new Date(item.date).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}
