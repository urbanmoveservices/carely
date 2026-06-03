"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatRelation } from "@/lib/family-utils";
import type { HealthInsight } from "@/types";
import { CheckCircle, Trash2, Info, AlertTriangle } from "lucide-react";

const SEVERITY_VARIANT: Record<string, "info" | "warning" | "critical" | "default"> = {
  info: "info",
  warning: "warning",
  critical: "critical",
};

export function InsightCard({
  insight,
  onRead,
  onDelete,
  busy,
}: {
  insight: HealthInsight;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  busy?: boolean;
}) {
  const Icon =
    insight.severity === "critical"
      ? AlertTriangle
      : insight.severity === "warning"
        ? AlertTriangle
        : Info;

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        insight.isRead ? "border-gray-100 bg-white" : "border-brand-100 bg-brand-50/30"
      }`}
    >
      <div className="flex gap-3">
        <Icon
          className={`h-5 w-5 shrink-0 mt-0.5 ${
            insight.severity === "warning"
              ? "text-amber-600"
              : insight.severity === "critical"
                ? "text-red-600"
                : "text-brand-600"
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 text-sm">{insight.title}</h3>
            <Badge variant={SEVERITY_VARIANT[insight.severity] || "default"}>
              {insight.severity}
            </Badge>
          </div>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{insight.message}</p>
          <p className="text-xs text-gray-400 mt-2">
            {new Date(insight.createdAt).toLocaleString()}
            {insight.familyMember &&
              ` · ${formatRelation(insight.familyMember.relation)} — ${insight.familyMember.fullName}`}
          </p>
          <div className="flex gap-2 mt-3">
            {!insight.isRead && (
              <Button
                size="sm"
                variant="outline"
                className="min-h-[40px]"
                disabled={busy}
                onClick={() => onRead(insight.id)}
              >
                <CheckCircle className="h-4 w-4" /> Mark read
              </Button>
            )}
            <button
              type="button"
              onClick={() => onDelete(insight.id)}
              disabled={busy}
              className="inline-flex items-center gap-1 text-sm text-red-600 min-h-[40px] px-2"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
