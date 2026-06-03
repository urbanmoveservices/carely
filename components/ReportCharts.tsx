"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import type { ChartDataPoint } from "@/types";
import { useTranslation } from "@/lib/i18n/use-translation";

interface ReportChartsProps {
  data: ChartDataPoint[];
}

function getBarColor(point: ChartDataPoint): string {
  if (point.normalMin == null && point.normalMax == null) return "#0d9488";
  if (point.normalMax != null && point.value > point.normalMax) return "#ef4444";
  if (point.normalMin != null && point.value < point.normalMin) return "#3b82f6";
  return "#10b981";
}

export default function ReportCharts({ data }: ReportChartsProps) {
  const { t } = useTranslation();
  if (!data || data.length === 0) return null;

  const chartData = data.map((d) => ({
    ...d,
    fill: getBarColor(d),
  }));

  return (
    <div className="space-y-6">
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "#6b7280" }}
            angle={-20}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as ChartDataPoint & { fill: string };
              return (
                <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg text-sm">
                  <p className="font-semibold text-gray-900">{d.label}</p>
                  <p className="text-gray-600">
                    {t("report.value")}: <strong>{d.value}</strong>{" "}
                    {d.unit && <span className="text-gray-400">{d.unit}</span>}
                  </p>
                  {(d.normalMin != null || d.normalMax != null) && (
                    <p className="text-xs text-gray-400">
                      {t("report.normal")}: {d.normalMin ?? "—"} – {d.normalMax ?? "—"}
                      {d.unit ? ` ${d.unit}` : ""}
                    </p>
                  )}
                </div>
              );
            }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
            {chartData.map((entry, idx) => (
              <Cell key={idx} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-green-500" />
          {t("status.normal")}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-red-500" />
          {t("report.chartAbove")}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-blue-500" />
          {t("report.chartBelow")}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-brand-500" />
          {t("report.chartNoRef")}
        </div>
      </div>
    </div>
  );
}
