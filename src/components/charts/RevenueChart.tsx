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
import { useTranslation } from "react-i18next";
import type { RevenuePoint } from "@/types";
import { formatCurrency } from "@/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

interface RevenueChartProps {
  data: RevenuePoint[];
  loading?: boolean;
}

function CustomTooltip({ active, payload, label }: any) {
  const { t } = useTranslation();
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111827]/90 backdrop-blur-xl border border-[#334155] rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-[#94A3B8] text-xs mb-1.5 font-medium">{label}</p>
      <p className="text-white font-bold text-base">{formatCurrency(payload[0].value)}</p>
      <div className="flex items-center gap-1.5 mt-1">
        <div className="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
        <p className="text-[#64748B] text-xs">{t("dashboard.ordersLabel", { count: payload[0]?.payload?.orders })}</p>
      </div>
    </div>
  );
}

export function RevenueChart({ data, loading }: RevenueChartProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  return (
    <Card className="lg:col-span-2" hover={false}>
      <CardHeader>
        <CardTitle>{t("dashboard.revenueTrend")}</CardTitle>
      </CardHeader>
      {loading ? (
        <div className="h-[300px] flex items-center justify-center">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-[#1F2937] rounded-full" />
            <div className="w-10 h-10 border-2 border-transparent border-t-[#6366F1] rounded-full animate-spin absolute inset-0" />
          </div>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-[#64748B] text-sm">{t("dashboard.noRevenueData")}</div>
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: isRtl ? -10 : 10, left: isRtl ? 10 : -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity={0.5} />
                  <stop offset="60%" stopColor="#6366F1" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="#1F2937" vertical={false} />
              <XAxis
                dataKey="date"
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
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#6366F1", strokeWidth: 1, strokeDasharray: "4 4" }} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#6366F1"
                strokeWidth={2}
                fill="url(#revenueGradient)"
                dot={false}
                activeDot={{ r: 5, fill: "#6366F1", stroke: "#111827", strokeWidth: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
