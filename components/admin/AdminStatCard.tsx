import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface AdminStatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  color?: "teal" | "blue" | "green" | "red" | "yellow" | "purple";
  className?: string;
}

const colorMap = {
  teal: "bg-brand-50 text-brand-600",
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  red: "bg-red-50 text-red-600",
  yellow: "bg-yellow-50 text-yellow-600",
  purple: "bg-purple-50 text-purple-600",
};

export function AdminStatCard({
  title,
  value,
  icon: Icon,
  trend,
  color = "teal",
  className,
}: AdminStatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white p-5 shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className="mt-1 text-xs text-gray-400">{trend}</p>
          )}
        </div>
        <div className={cn("rounded-lg p-3", colorMap[color])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
