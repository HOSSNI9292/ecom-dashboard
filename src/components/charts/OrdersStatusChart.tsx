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
    <Card>
      <CardHeader>
        <CardTitle>Orders by Status</CardTitle>
      </CardHeader>
      {loading ? (
        <div className="h-[300px] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-dark-600 border-t-accent-500 rounded-full animate-spin" />
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-dark-400 text-sm">
          No order data available
        </div>
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
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #2a2a2a",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
              <Legend
                formatter={(value: string) => (
                  <span className="text-dark-200 text-sm">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
