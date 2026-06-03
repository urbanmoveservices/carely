import React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "user"
  | "admin"
  | "uploaded"
  | "processing"
  | "text_extracted"
  | "ai_completed"
  | "completed"
  | "failed"
  | "warning"
  | "critical"
  | "default"
  | "success"
  | "error"
  | "info";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  user: "bg-blue-50 text-blue-700 border-blue-200",
  admin: "bg-purple-50 text-purple-700 border-purple-200",
  uploaded: "bg-gray-50 text-gray-700 border-gray-200",
  processing: "bg-yellow-50 text-yellow-700 border-yellow-200",
  text_extracted: "bg-cyan-50 text-cyan-700 border-cyan-200",
  ai_completed: "bg-green-50 text-green-700 border-green-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  warning: "bg-orange-50 text-orange-700 border-orange-200",
  critical: "bg-red-100 text-red-800 border-red-300",
  default: "bg-gray-50 text-gray-700 border-gray-200",
  success: "bg-green-50 text-green-700 border-green-200",
  error: "bg-red-50 text-red-700 border-red-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
};

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
