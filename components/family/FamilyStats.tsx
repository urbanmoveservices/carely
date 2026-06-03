"use client";

import { Users, FileText, Calendar, Pill } from "lucide-react";
import type { FamilyStats as FamilyStatsType } from "@/types";

interface FamilyStatsProps {
  stats: FamilyStatsType;
}

export function FamilyStats({ stats }: FamilyStatsProps) {
  const cards = [
    { label: "Members", value: stats.totalMembers, icon: Users, color: "bg-brand-50 text-brand-700" },
    { label: "Linked reports", value: stats.linkedReports, icon: FileText, color: "bg-blue-50 text-blue-700" },
    { label: "Upcoming visits", value: stats.upcomingAppointments, icon: Calendar, color: "bg-amber-50 text-amber-700" },
    { label: "Active meds", value: stats.activeMedications, icon: Pill, color: "bg-purple-50 text-purple-700" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <div
          key={label}
          className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
        >
          <div className={`inline-flex rounded-lg p-2 ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      ))}
    </div>
  );
}
