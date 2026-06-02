"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { STATUS_COLORS } from "@/utils";
import type { DashboardStats } from "@/types";

interface OrdersStatusChartProps {
  stats: DashboardStats | null;
  loading?: boolean;
}

export function OrdersStatusChart({ stats, loading }: OrdersStatusChartProps) {
  if (!stats) return null;

  const chartData = [
    { name: "Pending", value: stats.pendingOrders, color: STATUS_COLORS.Pending },
    { name: "Confirmed", value: stats.confirmedOrders, color: STATUS_COLORS.Confirmed },
    { name: "Delivered", value: stats.deliveredOrders, color: STATUS_COLORS.Delivered },
    { name: "Cancelled", value: stats.cancelledOrders, color: STATUS_COLORS.Cancelled },
    { name: "Double", value: stats.doubleOrders, color: STATUS_COLORS.double },
    { name: "Transferred", value: stats.transferredOrders, color: STATUS_COLORS["A transférer"] },
    { name: "Out of Stock", value: stats.outOfStockOrders, color: STATUS_COLORS.OutOfStock },
  ].filter((d) => d.value > 0);

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
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111111",
                  border: "1px solid #1F1F1F",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "13px",
                }}
              />
              <Legend
                formatter={(value: string) => (
                  <span className="text-[#c0c0c0] text-xs">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
