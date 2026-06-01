"use client";

import { ShoppingCart, CheckCircle, Truck, DollarSign, TrendingUp, Package, AlertTriangle, Activity } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { OrdersStatusChart } from "@/components/charts/OrdersStatusChart";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageWrapper } from "@/components/PageWrapper";
import { useDashboardData } from "@/hooks";
import { formatCurrency, formatNumber, formatPercentage, formatDate } from "@/utils";
import type { Order } from "@/types";

export default function DashboardPage() {
  const { data, loading, error, refetch } = useDashboardData({ refreshInterval: 30000 });
  const stats = data?.stats;
  const isLoading = loading && !data;

  return (
    <PageWrapper loading={isLoading} error={error} onRetry={refetch}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Orders" value={formatNumber(stats?.totalOrders ?? 0)} icon={<ShoppingCart className="w-5 h-5" />} color="accent" subtitle="All time orders" />
          <StatCard title="Pending" value={formatNumber(stats?.pendingOrders ?? 0)} icon={<Activity className="w-5 h-5" />} color="warning" subtitle="Awaiting confirmation" />
          <StatCard title="Cancelled" value={formatNumber(stats?.cancelledOrders ?? 0)} icon={<AlertTriangle className="w-5 h-5" />} color="error" subtitle={`${formatNumber(stats?.outOfStockOrders ?? 0)} out of stock`} />
          <StatCard title="Revenue" value={formatCurrency(stats?.revenue ?? 0)} icon={<DollarSign className="w-5 h-5" />} color="success" subtitle={`Avg ${formatCurrency(stats?.averageOrderValue ?? 0)} per order`} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Confirmed" value={formatNumber(stats?.confirmedOrders ?? 0)} icon={<CheckCircle className="w-5 h-5" />} color="success" subtitle={stats ? formatPercentage(stats.confirmationRate) : "0%"} />
          <StatCard title="Delivered" value={formatNumber(stats?.deliveredOrders ?? 0)} icon={<Truck className="w-5 h-5" />} color="info" subtitle={stats ? formatPercentage(stats.deliveryRate) : "0%"} />
          <StatCard title="Confirmation Rate" value={stats ? formatPercentage(stats.confirmationRate) : "0%"} icon={<TrendingUp className="w-5 h-5" />} color="accent" />
          <StatCard title="Total Products" value={formatNumber(stats?.totalProducts ?? 0)} icon={<Package className="w-5 h-5" />} color="info" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <RevenueChart data={data?.revenueTrend ?? []} loading={isLoading} />
          <OrdersStatusChart stats={stats ?? null} loading={isLoading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Products</CardTitle>
            </CardHeader>
            {isLoading ? (
              <div className="py-8 flex justify-center"><div className="w-6 h-6 border-2 border-dark-600 border-t-accent-500 rounded-full animate-spin" /></div>
            ) : (
              <div className="space-y-3">
                {Object.entries(
                  (data?.products ?? []).reduce((acc: Record<string, { name: string; code: string; revenue: number; sold: number }>, p) => {
                    if (!acc[p.id]) acc[p.id] = { name: p.name, code: p.code, revenue: 0, sold: 0 };
                    acc[p.id].revenue += p.revenue;
                    acc[p.id].sold += p.totalSold;
                    return acc;
                  }, {})
                )
                  .sort(([, a]: any, [, b]: any) => b.revenue - a.revenue)
                  .slice(0, 5)
                  .map(([id, prod]: any, idx: number) => (
                    <div key={id} className="flex items-center justify-between py-2 border-b border-dark-700/50 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-dark-500 text-sm w-6">{idx + 1}.</span>
                        <div>
                          <p className="text-white text-sm font-medium">{prod.name}</p>
                          <p className="text-dark-400 text-xs">{prod.code}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-sm font-medium">{formatCurrency(prod.revenue)}</p>
                        <p className="text-dark-400 text-xs">{formatNumber(prod.sold)} sold</p>
                      </div>
                    </div>
                  ))}
                {(!data?.products || data.products.length === 0) && (
                  <p className="text-dark-400 text-sm text-center py-4">No product data</p>
                )}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            {isLoading ? (
              <div className="py-8 flex justify-center"><div className="w-6 h-6 border-2 border-dark-600 border-t-accent-500 rounded-full animate-spin" /></div>
            ) : (
              <div className="space-y-3">
                {(data?.orders ?? []).slice(0, 5).map((order: Order) => (
                  <div key={order.id} className="flex items-center justify-between py-2 border-b border-dark-700/50 last:border-0">
                    <div>
                      <p className="text-white text-sm font-medium">{order.customerName}</p>
                      <p className="text-dark-400 text-xs">{formatDate(order.date)}</p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <StatusBadge status={order.status} color={order.statusColor} />
                      <span className="text-white text-sm font-medium">{formatCurrency(order.amount)}</span>
                    </div>
                  </div>
                ))}
                {(!data?.orders || data.orders.length === 0) && (
                  <p className="text-dark-400 text-sm text-center py-4">No orders yet</p>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
