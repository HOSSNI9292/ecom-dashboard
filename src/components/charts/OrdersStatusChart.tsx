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

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "#F59E0B" },
  confirmed: { label: "Confirmed", color: "#10B981" },
  cancelled: { label: "Cancelled", color: "#EF4444" },
  double: { label: "Double", color: "#EC4899" },
  transferred: { label: "Transferred", color: "#8B5CF6" },
  out_of_stock: { label: "Out of Stock", color: "#6B7280" },
  unreached: { label: "Unreached", color: "#94A3B8" },
};

export function OrdersStatusChart({ stats, loading }: OrdersStatusChartProps) {
  const chartData = !stats
    ? []
    : Object.keys(STATUS_CONFIG).map((key) => {
        const cfg = STATUS_CONFIG[key];
        let value = 0;
        if (key === "pending") value = stats.pendingOrders;
        else if (key === "confirmed") value = stats.confirmedOrders;
        else if (key === "cancelled") value = stats.cancelledOrders;
        else if (key === "double") value = stats.doubleOrders;
        else if (key === "transferred") value = stats.transferredOrders;
        else if (key === "out_of_stock") value = stats.outOfStockOrders;
        else if (key === "unreached") value = stats.unreachedOrders;
        return { key, ...cfg, value };
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
        <CardTitle>Orders by Status</CardTitle>
      </CardHeader>
      {loading ? (
        <div className="h-[300px] flex items-center justify-center">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-[#1F1F1F] rounded-full" />
            <div className="w-10 h-10 border-2 border-transparent border-t-[#06B6D4] rounded-full animate-spin absolute inset-0" />
          </div>
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-[#606060] text-sm">No data</div>
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
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="#0A0A0A" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0.0";
                  return (
                    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 shadow-2xl">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-white text-sm font-semibold">{d.label}</span>
                      </div>
                      <div className="text-white/80 text-xs space-y-1">
                        <p className="text-white font-medium">{d.value.toLocaleString()} orders</p>
                        <p className="text-[#06B6D4] font-semibold text-sm">{pct}%</p>
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
                  <span className="text-[#c0c0c0] text-xs font-medium">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center">
            <p className="text-2xl font-bold text-white">{total.toLocaleString()}</p>
            <p className="text-[#606060] text-[11px] mt-0.5 leading-none">Total Orders</p>
          </div>
        </div>
      )}
    </Card>
  );
}
