"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ShoppingCart, CheckCircle, DollarSign, TrendingUp,
  Activity, Clock, Download, Eye, RefreshCw, Percent, Package
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { OrdersStatusChart } from "@/components/charts/OrdersStatusChart";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageWrapper } from "@/components/PageWrapper";
import { OrderModal } from "@/components/OrderModal";
import { DateFilter } from "@/components/DateFilter";
import { useDashboardData } from "@/hooks";
import { formatCurrency, formatNumber, formatPercentage, formatDate, filterOrdersByDate, DATE_FILTER_LABELS, getImageUrlOrFallback } from "@/utils";
import { exportToCSV } from "@/utils/csv";
import type { DateFilterValue } from "@/utils/dates";
import type { Order, Product } from "@/types";

function aggregateProducts(products: Product[]) {
  const map = new Map<string, Product>();
  for (const p of products) {
    const key = p.id;
    if (map.has(key)) {
      const ex = map.get(key)!;
      ex.totalSold += p.totalSold;
      ex.revenue += p.revenue;
    } else {
      map.set(key, { ...p });
    }
  }
  return Array.from(map.values());
}

export default function DashboardPage() {
  const { data, loading, error, refetch } = useDashboardData();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("all");

  const stats = data?.stats;
  const orders = data?.orders ?? [];
  const allProducts = data?.products ?? [];
  const aggregated = useMemo(() => aggregateProducts(allProducts), [allProducts]);
  const isLoading = loading && !data;

  const filteredOrders = useMemo(() => filterOrdersByDate(orders, dateFilter), [orders, dateFilter]);

  const filteredStats = useMemo(() => {
    const pendingOrders = filteredOrders.filter((o) => o.status === "pending").length;
    const confirmedOrders = filteredOrders.filter((o) => o.status === "confirmed" || o.status === "delivered" || o.status === "shipping").length;
    const deliveredOrders = filteredOrders.filter((o) => o.status === "delivered" || o.status === "shipping").length;
    const cancelledOrders = filteredOrders.filter((o) => o.status === "cancelled").length;
    const outOfStockOrders = filteredOrders.filter((o) => o.status === "out_of_stock").length;
    const doubleOrders = filteredOrders.filter((o) => o.status === "double").length;
    const transferredOrders = filteredOrders.filter((o) => o.status === "transferred").length;
    return { pendingOrders, confirmedOrders, deliveredOrders, cancelledOrders, outOfStockOrders, doubleOrders, transferredOrders };
  }, [filteredOrders]);

  const filteredRevenue = filteredOrders.reduce((s, o) => s + o.amount, 0);
  const filteredPending = filteredOrders.filter((o) => o.status === "pending").length;
  const filteredConfirmed = filteredOrders.filter((o) => o.status === "confirmed").length;
  const filteredNonCancelled = filteredOrders.filter((o) => o.status !== "cancelled" && o.status !== "out_of_stock").length;
  const filteredConfRate = filteredNonCancelled > 0 ? filteredConfirmed / filteredNonCancelled : 0;
  const filteredProcessedRevenue = filteredOrders.filter((o) => o.status === "confirmed").reduce((s, o) => s + o.amount, 0);
  const filteredDeliverable = filteredOrders.filter((o) => o.status !== "cancelled" && o.status !== "out_of_stock").length;
  const filteredDeliveryRate = filteredDeliverable > 0 ? filteredConfirmed / filteredDeliverable : 0;

  const topSelling = useMemo(() => [...aggregated].sort((a, b) => b.totalSold - a.totalSold).slice(0, 5), [aggregated]);
  const topRevenue = useMemo(() => [...aggregated].sort((a, b) => b.revenue - a.revenue).slice(0, 5), [aggregated]);
  const lowestStock = useMemo(() => [...aggregated].filter((p) => p.stockQuantity > 0).sort((a, b) => a.stockQuantity - b.stockQuantity).slice(0, 5), [aggregated]);

  const bestCountry = useMemo(() => {
    if (!data?.countries?.length) return null;
    return [...data.countries].sort((a, b) => b.netRevenue - a.netRevenue)[0];
  }, [data?.countries]);

  const bestProduct = useMemo(() => {
    if (!aggregated.length) return null;
    return [...aggregated].sort((a, b) => b.revenue - a.revenue)[0];
  }, [aggregated]);

  const handleExport = useCallback(() => {
    exportToCSV(
      filteredOrders.map((o) => ({
        orderId: o.orderId,
        customerName: o.customerName,
        phone: o.phone,
        country: o.countryName || o.country,
        productName: o.productName,
        amount: o.amount,
        status: o.status,
        date: o.date?.substring(0, 10),
      })),
      "orders_export",
      { orderId: "Order ID", customerName: "Customer", phone: "Phone", country: "Country", productName: "Product", amount: "Amount (XOF)", status: "Status", date: "Date" }
    );
  }, [filteredOrders]);

  return (
    <PageWrapper loading={isLoading} error={error} onRetry={refetch} hasData={!!data}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <DateFilter value={dateFilter} onChange={setDateFilter} />
          <div className="flex items-center gap-2">
            <button
              onClick={refetch}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#606060] hover:text-white hover:bg-[#111111] border border-[#1F1F1F] transition-all duration-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#606060] hover:text-white hover:bg-[#111111] border border-[#1F1F1F] transition-all duration-200"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title={dateFilter === "all" ? "Total Orders" : `${DATE_FILTER_LABELS[dateFilter]} Orders`} value={formatNumber(filteredOrders.length)} icon={<ShoppingCart className="w-5 h-5" />} color="primary" delay={0} />
          <StatCard title={dateFilter === "all" ? "Total Revenue" : `${DATE_FILTER_LABELS[dateFilter]} Revenue`} value={formatCurrency(filteredRevenue)} icon={<DollarSign className="w-5 h-5" />} color="success" delay={50} />
          <StatCard title="Processed Orders" value={formatNumber(filteredConfirmed)} icon={<CheckCircle className="w-5 h-5" />} color="info" delay={100} subtitle="Paid by CodinAfrica" />
          <StatCard title="Processed Revenue" value={formatCurrency(filteredProcessedRevenue)} icon={<TrendingUp className="w-5 h-5" />} color="success" delay={150} subtitle="Real collected revenue" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Net Revenue" value={formatCurrency(stats?.netRevenue ?? 0)} icon={<DollarSign className="w-5 h-5" />} color="success" delay={200} subtitle="After service fees" />
          <StatCard title="Service Fees" value={formatCurrency(stats?.serviceFeesTotal ?? 0)} icon={<Percent className="w-5 h-5" />} color="warning" delay={250} subtitle="CodinAfrica fees" />
          <StatCard title="Delivery Rate" value={formatPercentage(filteredDeliveryRate)} icon={<Activity className="w-5 h-5" />} color="info" delay={300} subtitle="Based on Processed" />
          <StatCard title="Confirmation Rate" value={formatPercentage(filteredConfRate)} icon={<CheckCircle className="w-5 h-5" />} color="success" delay={350} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Average Order Value" value={formatCurrency(filteredOrders.length > 0 ? filteredRevenue / filteredOrders.length : 0)} icon={<TrendingUp className="w-5 h-5" />} color="info" delay={400} />
          <StatCard title="Total Products" value={formatNumber(stats?.totalProducts ?? 0)} icon={<Package className="w-5 h-5" />} color="primary" delay={450} subtitle="Unique items" />
          <StatCard title="Pending" value={formatNumber(filteredPending)} icon={<Clock className="w-5 h-5" />} color="warning" delay={500} subtitle={`${filteredOrders.length > 0 ? ((filteredPending / filteredOrders.length) * 100).toFixed(1) : 0}% of total`} />
          <StatCard title="Confirmed Orders" value={formatNumber(stats?.confirmedOrders ?? 0)} icon={<CheckCircle className="w-5 h-5" />} color="success" delay={550} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <RevenueChart data={data?.revenueTrend ?? []} loading={isLoading} />
          <OrdersStatusChart stats={filteredStats} loading={isLoading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card gradient>
            <CardHeader>
              <CardTitle>Best Selling</CardTitle>
              <span className="text-[#606060] text-xs font-medium">Top 5</span>
            </CardHeader>
            <div className="space-y-2">
              {topSelling.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[#1F1F1F]/50 transition-all duration-200">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0 ? "bg-[#f59e0b]/20 text-[#f59e0b]" : i === 1 ? "bg-[#808080]/20 text-[#808080]" : i === 2 ? "bg-[#8b5cf6]/20 text-[#8b5cf6]" : "bg-[#1F1F1F] text-[#606060]"
                    }`}>
                      {i + 1}
                    </div>
                    <p className="text-white text-sm truncate">{p.name}</p>
                  </div>
                  <span className="text-white text-sm font-medium shrink-0 ml-2">{formatNumber(p.totalSold)}</span>
                </div>
              ))}
              {topSelling.length === 0 && <p className="text-[#606060] text-sm text-center py-4">No data</p>}
            </div>
          </Card>
          <Card gradient>
            <CardHeader>
              <CardTitle>Highest Revenue</CardTitle>
              <span className="text-[#606060] text-xs font-medium">Top 5</span>
            </CardHeader>
            <div className="space-y-2">
              {topRevenue.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[#1F1F1F]/50 transition-all duration-200">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0 ? "bg-[#10b981]/20 text-[#10b981]" : i === 1 ? "bg-[#808080]/20 text-[#808080]" : i === 2 ? "bg-[#06B6D4]/20 text-[#06B6D4]" : "bg-[#1F1F1F] text-[#606060]"
                    }`}>
                      {i + 1}
                    </div>
                    <p className="text-white text-sm truncate">{p.name}</p>
                  </div>
                  <span className="text-[#10b981] text-sm font-medium shrink-0 ml-2">{formatCurrency(p.revenue)}</span>
                </div>
              ))}
              {topRevenue.length === 0 && <p className="text-[#606060] text-sm text-center py-4">No data</p>}
            </div>
          </Card>
          <Card gradient>
            <CardHeader>
              <CardTitle>Lowest Stock</CardTitle>
              <span className="text-[#606060] text-xs font-medium">Needs attention</span>
            </CardHeader>
            <div className="space-y-2">
              {lowestStock.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[#1F1F1F]/50 transition-all duration-200">
                  <p className="text-white text-sm truncate">{p.name}</p>
                  <span className={`text-sm font-medium shrink-0 ml-2 ${p.stockQuantity <= 3 ? "text-[#ef4444]" : "text-[#f59e0b]"}`}>
                    {formatNumber(p.stockQuantity)}
                  </span>
                </div>
              ))}
              {lowestStock.length === 0 && <p className="text-[#606060] text-sm text-center py-4">All well stocked</p>}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {bestCountry && (
            <Card className="bg-gradient-to-br from-[#06B6D4]/10 via-[#111111] to-[#111111] border-[#06B6D4]/20" hover={false}>
              <CardHeader>
                <CardTitle>Best Performing Country</CardTitle>
                <span className="text-[#10b981] text-xs font-medium">By Net Revenue</span>
              </CardHeader>
              <div className="flex items-center gap-5">
                {bestCountry.flag && (
                  <img src={bestCountry.flag} alt={bestCountry.countryName} className="w-14 h-10 rounded-lg object-cover shadow-lg" />
                )}
                <div>
                  <p className="text-2xl font-bold text-white">{bestCountry.countryName}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <div>
                      <p className="text-[#10b981] text-sm font-semibold">{formatCurrency(bestCountry.netRevenue)}</p>
                      <p className="text-[#606060] text-[11px]">Net Revenue</p>
                    </div>
                    <div className="w-px h-8 bg-[#1F1F1F]" />
                    <div>
                      <p className="text-white text-sm font-semibold">{formatNumber(bestCountry.processedOrders)}</p>
                      <p className="text-[#606060] text-[11px]">Processed</p>
                    </div>
                    <div className="w-px h-8 bg-[#1F1F1F]" />
                    <div>
                      <p className="text-[#22D3EE] text-sm font-semibold">{formatPercentage(bestCountry.deliveryRate)}</p>
                      <p className="text-[#606060] text-[11px]">Delivery Rate</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
          {bestProduct && (
            <Card className="bg-gradient-to-br from-[#10b981]/10 via-[#111111] to-[#111111] border-[#10b981]/20" hover={false}>
              <CardHeader>
                <CardTitle>Best Performing Product</CardTitle>
                <span className="text-[#10b981] text-xs font-medium">By Revenue</span>
              </CardHeader>
              <div className="flex items-center gap-4">
                {bestProduct.image ? (
                  <div className="w-16 h-16 rounded-xl bg-[#1F1F1F] flex items-center justify-center shrink-0 overflow-hidden">
                    <img src={getImageUrlOrFallback(bestProduct.image)} alt={bestProduct.name} className="w-full h-full object-contain p-1" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-[#1F1F1F] flex items-center justify-center shrink-0">
                    <Package className="w-6 h-6 text-[#606060]" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold text-white truncate">{bestProduct.name}</p>
                  <div className="flex items-center gap-4 mt-1.5">
                    <div>
                      <p className="text-[#10b981] text-sm font-semibold">{formatCurrency(bestProduct.revenue)}</p>
                      <p className="text-[#606060] text-[11px]">Revenue</p>
                    </div>
                    <div className="w-px h-7 bg-[#1F1F1F]" />
                    <div>
                      <p className="text-white text-sm font-semibold">{formatNumber(bestProduct.totalSold)}</p>
                      <p className="text-[#606060] text-[11px]">Sold</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
          <Card gradient>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <span className="text-[#606060] text-xs">Latest 5</span>
            </CardHeader>
            <div className="space-y-2">
              {filteredOrders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-[#1F1F1F]/50 hover:border-[#06B6D4]/20 hover:bg-[#1A1A1A] transition-all duration-200 cursor-pointer group"
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Eye className="w-3.5 h-3.5 text-[#606060] group-hover:text-[#22D3EE] shrink-0 transition-colors duration-200" />
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{order.customerName}</p>
                      <p className="text-[#606060] text-xs">{formatDate(order.date)}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3 shrink-0 ml-3">
                    <StatusBadge status={order.status} color={order.statusColor} />
                    <span className="text-white text-sm font-medium">{formatCurrency(order.amount)}</span>
                  </div>
                </div>
              ))}
              {filteredOrders.length === 0 && <p className="text-[#606060] text-sm text-center py-4">No data</p>}
            </div>
          </Card>
        </div>
      </div>

      <OrderModal order={selectedOrder} open={!!selectedOrder} onClose={() => setSelectedOrder(null)} />
    </PageWrapper>
  );
}
