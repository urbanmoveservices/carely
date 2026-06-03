"use client";

import { Badge } from "@/components/ui/Badge";
import type { ReminderStatus } from "@/types";

const VARIANTS: Record<ReminderStatus, "warning" | "success" | "default" | "failed"> = {
  pending: "warning",
  done: "success",
  skipped: "default",
  cancelled: "failed",
};

export function ReminderStatusBadge({ status }: { status: ReminderStatus }) {
  return (
    <Badge variant={VARIANTS[status] || "default"} className="capitalize">
      {status}
    </Badge>
  );
}
