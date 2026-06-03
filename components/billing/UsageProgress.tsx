"use client";

import { cn } from "@/lib/utils";

export function UsageProgress({
  label,
  used,
  limit,
  warnAt = 0.8,
}: {
  label: string;
  used: number;
  limit: number;
  warnAt?: number;
}) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const nearLimit = limit > 0 && used / limit >= warnAt;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-700">{label}</span>
        <span
          className={cn(
            "font-medium",
            nearLimit ? "text-amber-700" : "text-gray-600"
          )}
        >
          {used} / {limit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            nearLimit ? "bg-amber-500" : "bg-brand-600"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
