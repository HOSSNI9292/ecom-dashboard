"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { RevenuePoint } from "@/types";
import { formatCurrency } from "@/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

interface RevenueChartProps {
  data: RevenuePoint[];
  loading?: boolean;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#141417] border border-[#27272A] rounded-xl p-4 shadow-glass shadow-[#10B981]/5">
      <p className="text-[#71717A] text-xs mb-1.5">{label}</p>
      <p className="text-[#FAFAFA] font-bold text-base">{formatCurrency(payload[0].value)}</p>
      <p className="text-[#71717A] text-[11px] mt-0.5">{payload[0]?.payload?.orders} orders</p>
    </div>
  );
}

export function RevenueChart({ data, loading }: RevenueChartProps) {
  return (
    <Card className="lg:col-span-2" hover={false} glass>
      <CardHeader>
        <CardTitle>Revenue Trend</CardTitle>
      </CardHeader>
      {loading ? (
        <div className="h-[300px] flex items-center justify-center">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-[#27272A] rounded-full" />
            <div className="w-10 h-10 border-2 border-transparent border-t-[#10B981] rounded-full animate-spin absolute inset-0" />
          </div>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-[#71717A] text-sm">No revenue data available</div>
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                  <stop offset="50%" stopColor="#10B981" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="revenueStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#0EA5E9" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="#27272A" vertical={false} />
              <XAxis
                dataKey="date"
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
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#10B981", strokeWidth: 1, strokeDasharray: "4 4" }} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="url(#revenueStroke)"
                strokeWidth={2.5}
                fill="url(#revenueGradient)"
                dot={false}
                activeDot={{ r: 5, fill: "#10B981", stroke: "#141417", strokeWidth: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
