"use client";

import { useCallback } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Sector,
} from "recharts";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

interface FilteredChartStats {
  pendingOrders: number;
  confirmedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  outOfStockOrders: number;
  doubleOrders: number;
  transferredOrders: number;
  unreachedOrders: number;
}

interface OrdersStatusChartProps {
  stats: FilteredChartStats | null;
  loading?: boolean;
}

const STATUS_KEYS = [
  { key: "pending", tKey: "status.pending", color: "#F59E0B" },
  { key: "confirmed", tKey: "status.confirmed", color: "#10B981" },
  { key: "cancelled", tKey: "status.cancelled", color: "#EF4444" },
  { key: "double", tKey: "status.double", color: "#EC4899" },
  { key: "transferred", tKey: "status.transferred", color: "#8B5CF6" },
  { key: "out_of_stock", tKey: "status.outOfStock", color: "#64748B" },
  { key: "unreached", tKey: "status.unreached", color: "#94A3B8" },
];

const RADIAN = Math.PI / 180;

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return percent > 0.05 ? (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  ) : null;
};

export function OrdersStatusChart({ stats, loading }: OrdersStatusChartProps) {
  const { t } = useTranslation();

  const chartData = !stats
    ? []
    : STATUS_KEYS.map((s) => {
        let value = 0;
        if (s.key === "pending") value = stats.pendingOrders;
        else if (s.key === "confirmed") value = stats.confirmedOrders;
        else if (s.key === "cancelled") value = stats.cancelledOrders;
        else if (s.key === "double") value = stats.doubleOrders;
        else if (s.key === "transferred") value = stats.transferredOrders;
        else if (s.key === "out_of_stock") value = stats.outOfStockOrders;
        else if (s.key === "unreached") value = stats.unreachedOrders;
        return { key: s.key, label: t(s.tKey), color: s.color, value };
      }).filter((d) => d.value > 0).sort((a, b) => b.value - a.value);

  const total = chartData.reduce((s, d) => s + d.value, 0);

  const renderActiveShape = useCallback((props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius - 2} outerRadius={outerRadius + 4} startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.3} />
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      </g>
    );
  }, []);

  return (
    <Card hover={false}>
      <CardHeader>
        <CardTitle>{t("dashboard.ordersByStatus")}</CardTitle>
      </CardHeader>
      {loading ? (
        <div className="h-[300px] flex items-center justify-center">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-[#1F2937] rounded-full" />
            <div className="w-10 h-10 border-2 border-transparent border-t-[#6366F1] rounded-full animate-spin absolute inset-0" />
          </div>
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-[#64748B] text-sm">{t("dashboard.noData")}</div>
      ) : (
        <div className="h-[340px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={72}
                outerRadius={110}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
                activeShape={renderActiveShape}
                activeIndex={undefined}
                label={renderCustomizedLabel}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="#111827" strokeWidth={3} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0.0";
                  return (
                    <div className="bg-[#111827] border border-[#334155] rounded-xl px-4 py-3 shadow-2xl backdrop-blur-xl">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-white text-sm font-semibold">{d.label}</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-white font-medium text-sm">{d.value.toLocaleString()} {t("common.orders")}</p>
                        <p className="text-[#6366F1] font-semibold">{pct}%</p>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={10}
                formatter={(value: string) => (
                  <span className="text-[#94A3B8] text-xs font-medium">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center">
            <p className="text-2xl font-bold text-white">{total.toLocaleString()}</p>
            <p className="text-[#64748B] text-[11px] mt-0.5 leading-none">{t("dashboard.totalOrdersLabel")}</p>
          </div>
        </div>
      )}
    </Card>
  );
}
