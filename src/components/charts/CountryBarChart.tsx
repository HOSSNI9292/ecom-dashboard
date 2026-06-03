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
    <div className="bg-[#141417] border border-[#27272A] rounded-xl p-3 shadow-glass">
      <p className="text-[#71717A] text-xs mb-1">{label}</p>
      <p className="text-[#FAFAFA] font-semibold text-sm">
        {dataKey === "revenue"
          ? formatCurrency(val)
          : dataKey === "confirmationRate"
            ? `${(val * 100).toFixed(1)}%`
            : val}
      </p>
    </div>
  );
}

export function CountryBarChart({
  data,
  loading,
  dataKey = "revenue",
  title = "Revenue by Country",
}: CountryBarChartProps) {
  const chartData = [...(data || [])]
    .sort((a, b) => (b[dataKey] as number) - (a[dataKey] as number))
    .slice(0, 10);

  const barColor = dataKey === "revenue"
    ? "#10B981"
    : dataKey === "orders"
      ? "#10B981"
      : "#F59E0B";

  return (
    <Card hover={false} className="lg:col-span-2" glass>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      {loading ? (
        <div className="h-[300px] flex items-center justify-center">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-[#27272A] rounded-full" />
            <div className="w-10 h-10 border-2 border-transparent border-t-[#10B981] rounded-full animate-spin absolute inset-0" />
          </div>
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-[#71717A] text-sm">No data</div>
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id={`barGradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={barColor} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={barColor} stopOpacity={0.35} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="#27272A" vertical={false} />
              <XAxis
                dataKey="countryName"
                stroke="#3F3F46"
                tick={{ fontSize: 11, fill: "#71717A" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#3F3F46"
                tick={{ fontSize: 11, fill: "#71717A" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  dataKey === "revenue" ? `${(v / 1000).toFixed(0)}k` : String(v)
                }
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#27272A" }} />
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
