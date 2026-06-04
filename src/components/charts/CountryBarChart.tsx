"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTranslation } from "react-i18next";
import type { CountryStats } from "@/types";
import { formatCurrency } from "@/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

interface CountryBarChartProps {
  data: CountryStats[];
  loading?: boolean;
  dataKey?: "revenue" | "orders" | "confirmationRate";
  title?: string;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const dataKey = payload[0].dataKey;
  return (
    <div className="bg-[#111827]/90 backdrop-blur-xl border border-[#334155] rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-[#94A3B8] text-xs mb-1.5 font-medium">{label}</p>
      <p className="text-white font-bold text-sm">
        {dataKey === "revenue"
          ? formatCurrency(val)
          : dataKey === "confirmationRate"
            ? `${(val * 100).toFixed(1)}%`
            : val.toLocaleString()}
      </p>
    </div>
  );
}

export function CountryBarChart({
  data,
  loading,
  dataKey = "revenue",
  title,
}: CountryBarChartProps) {
  const { t } = useTranslation();
  const chartTitle = title || t("dashboard.highestRevenue");

  const chartData = [...(data || [])]
    .sort((a, b) => (b[dataKey] as number) - (a[dataKey] as number))
    .slice(0, 10);

  const barColor = dataKey === "revenue"
    ? "#6366F1"
    : dataKey === "orders"
      ? "#10b981"
      : "#f59e0b";

  return (
    <Card hover={false} className="lg:col-span-2">
      <CardHeader>
        <CardTitle>{chartTitle}</CardTitle>
      </CardHeader>
      {loading ? (
        <div className="h-[300px] flex items-center justify-center">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-[#1F2937] rounded-full" />
            <div className="w-10 h-10 border-2 border-transparent border-t-[#6366F1] rounded-full animate-spin absolute inset-0" />
          </div>
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-[#64748B] text-sm">{t("common.noData")}</div>
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id={`barGradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={barColor} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={barColor} stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="#1F2937" vertical={false} />
              <XAxis
                dataKey="countryName"
                stroke="#475569"
                tick={{ fontSize: 11, fill: "#64748B" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#475569"
                tick={{ fontSize: 11, fill: "#64748B" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  dataKey === "revenue" ? `${(v / 1000).toFixed(0)}k` : String(v)
                }
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#1F2937" }} />
              <Bar
                dataKey={dataKey}
                fill={`url(#barGradient-${dataKey})`}
                radius={[6, 6, 0, 0]}
                maxBarSize={44}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
