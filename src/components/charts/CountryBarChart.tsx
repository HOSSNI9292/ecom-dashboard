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
import { COUNTRY_COLORS } from "@/utils";

interface CountryBarChartProps {
  data: CountryStats[];
  loading?: boolean;
  dataKey?: "revenue" | "orders" | "confirmationRate";
  title?: string;
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

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      {loading ? (
        <div className="h-[300px] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-dark-600 border-t-accent-500 rounded-full animate-spin" />
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-dark-400 text-sm">
          No country data available
        </div>
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="countryName" stroke="#606060" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis
                stroke="#606060"
                tick={{ fontSize: 12 }}
                tickLine={false}
                tickFormatter={(v) =>
                  dataKey === "revenue" ? `${(v / 1000).toFixed(0)}k` : String(v)
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #2a2a2a",
                  borderRadius: "8px",
                  color: "#fff",
                }}
                formatter={(value: number) =>
                  dataKey === "revenue"
                    ? [formatCurrency(value), "Revenue"]
                    : dataKey === "confirmationRate"
                      ? [`${(value * 100).toFixed(1)}%`, "Rate"]
                      : [value, "Orders"]
                }
              />
              <Bar dataKey={dataKey} fill={COUNTRY_COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
