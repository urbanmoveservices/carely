import React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from "lucide-react";

type AlertVariant = "info" | "success" | "warning" | "error";

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const styles: Record<AlertVariant, { bg: string; icon: React.ReactNode }> = {
  info: {
    bg: "bg-blue-50 border-blue-200 text-blue-800",
    icon: <Info className="h-5 w-5 text-blue-500" />,
  },
  success: {
    bg: "bg-green-50 border-green-200 text-green-800",
    icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  },
  warning: {
    bg: "bg-yellow-50 border-yellow-200 text-yellow-800",
    icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
  },
  error: {
    bg: "bg-red-50 border-red-200 text-red-800",
    icon: <AlertCircle className="h-5 w-5 text-red-500" />,
  },
};

export function Alert({ variant = "info", title, children, className }: AlertProps) {
  const s = styles[variant];
  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border p-4",
        s.bg,
        className
      )}
    >
      <div className="flex-shrink-0 mt-0.5">{s.icon}</div>
      <div>
        {title && <p className="font-semibold mb-1">{title}</p>}
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}
