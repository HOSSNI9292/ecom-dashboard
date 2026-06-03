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
    <div className="bg-[#111111] border border-[#1F1F1F] rounded-lg p-3 shadow-2xl">
      <p className="text-[#606060] text-xs mb-1">{label}</p>
      <p className="text-white font-semibold text-sm">{formatCurrency(payload[0].value)}</p>
      <p className="text-[#606060] text-[11px]">{payload[0]?.payload?.orders} orders</p>
    </div>
  );
}

export function RevenueChart({ data, loading }: RevenueChartProps) {
  return (
    <Card className="lg:col-span-2" hover={false}>
      <CardHeader>
        <CardTitle>Revenue Trend</CardTitle>
      </CardHeader>
      {loading ? (
        <div className="h-[300px] flex items-center justify-center">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-[#1F1F1F] rounded-full" />
            <div className="w-10 h-10 border-2 border-transparent border-t-[#06B6D4] rounded-full animate-spin absolute inset-0" />
          </div>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-[#606060] text-sm">No revenue data available</div>
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.4} />
                  <stop offset="50%" stopColor="#06B6D4" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="#1F1F1F" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#404040"
                tick={{ fontSize: 11, fill: "#606060" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#404040"
                tick={{ fontSize: 11, fill: "#606060" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#06B6D4", strokeWidth: 1, strokeDasharray: "4 4" }} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#06B6D4"
                strokeWidth={2}
                fill="url(#revenueGradient)"
                dot={false}
                activeDot={{ r: 4, fill: "#06B6D4", stroke: "#111111", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
