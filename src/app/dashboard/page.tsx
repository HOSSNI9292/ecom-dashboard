"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ShoppingCart, CheckCircle, DollarSign, TrendingUp,
  Activity, Clock, Download, RefreshCw, Percent, Package,
  Globe, Zap, Shield
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
import { formatCurrency, formatNumber, formatPercentage, formatDate, filterOrdersByDate, DATE_FILTER_LABELS, getImageUrlOrFallback, getFeeForCountry, computeServiceFees, COUNTRY_NAMES, COUNTRY_FLAGS } from "@/utils";
import { exportToCSV } from "@/utils/csv";
import type { DateFilterValue } from "@/utils/dates";
import type { Order, Product } from "@/types";

export default function DashboardPage() {
  const { data, loading, error, refetch } = useDashboardData();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("all");

  const orders = data?.orders ?? [];
  const allProducts = data?.products ?? [];
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
    const unreachedOrders = filteredOrders.filter((o) => o.status === "unreached").length;
    return { pendingOrders, confirmedOrders, deliveredOrders, cancelledOrders, outOfStockOrders, doubleOrders, transferredOrders, unreachedOrders };
  }, [filteredOrders]);

  const filteredRevenue = filteredOrders.reduce((s, o) => s + o.amount, 0);
  const filteredPending = filteredOrders.filter((o) => o.status === "pending").length;
  const filteredConfirmed = filteredOrders.filter((o) => o.status === "confirmed").length;
  const filteredNonCancelled = filteredOrders.filter((o) => o.status !== "cancelled" && o.status !== "out_of_stock").length;
  const filteredConfRate = filteredNonCancelled > 0 ? filteredConfirmed / filteredNonCancelled : 0;
  const filteredProcessedOrders = filteredOrders.filter((o) => o.status === "confirmed").length;
  const filteredProcessedRevenue = filteredOrders.filter((o) => o.status === "confirmed").reduce((s, o) => s + o.amount, 0);
  const filteredDeliveryRate = filteredOrders.length > 0 ? filteredProcessedOrders / filteredOrders.length : 0;

  const filteredServiceFees = useMemo(() => {
    const byCountry = new Map<string, number>();
    for (const o of filteredOrders) {
      if (o.status === "confirmed") {
        const c = o.country || "XX";
        byCountry.set(c, (byCountry.get(c) || 0) + 1);
      }
    }
    let total = 0;
    for (const [country, count] of byCountry) {
      total += computeServiceFees(count, getFeeForCountry(country));
    }
    return total;
  }, [filteredOrders]);

  const filteredNetRevenue = filteredProcessedRevenue - filteredServiceFees;

  const filteredRevenueTrend = useMemo(() => {
    const dayMap = new Map<string, { revenue: number; orders: number }>();
    for (const o of filteredOrders) {
      const day = o.date?.substring(0, 10);
      if (!day) continue;
      if (!dayMap.has(day)) dayMap.set(day, { revenue: 0, orders: 0 });
      const entry = dayMap.get(day)!;
      entry.revenue += o.amount;
      entry.orders += 1;
    }
    return Array.from(dayMap.entries())
      .map(([date, d]) => ({ date, ...d }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredOrders]);

  const productSales = useMemo(() => {
    const map = new Map<string, { id: string; name: string; totalSold: number; revenue: number; image?: string }>();
    for (const o of filteredOrders) {
      const key = o.productCode || o.productName;
      if (!key) continue;
      if (!map.has(key)) {
        const fromAll = allProducts.find((p) => (o.productCode && p.code === o.productCode) || p.name === o.productName);
        map.set(key, { id: o.productCode || key, name: o.productName, totalSold: 0, revenue: 0, image: fromAll?.image || o.productImage });
      }
      const entry = map.get(key)!;
      entry.totalSold += 1;
      entry.revenue += o.amount;
    }
    return Array.from(map.values());
  }, [filteredOrders, allProducts]);

  const topSelling = useMemo(() => [...productSales].sort((a, b) => b.totalSold - a.totalSold).slice(0, 5), [productSales]);
  const topRevenue = useMemo(() => [...productSales].sort((a, b) => b.revenue - a.revenue).slice(0, 5), [productSales]);

  const bestProduct = useMemo(() => productSales.length > 0 ? [...productSales].sort((a, b) => b.revenue - a.revenue)[0] : null, [productSales]);

  const lowestStock = useMemo(() => [...allProducts].filter((p) => p.stockQuantity > 0).sort((a, b) => a.stockQuantity - b.stockQuantity).slice(0, 5), [allProducts]);

  const countryStats = useMemo(() => {
    const map = new Map<string, { orders: number; revenue: number; processedOrders: number; processedRevenue: number }>();
    for (const o of filteredOrders) {
      const c = o.country || "XX";
      if (!map.has(c)) map.set(c, { orders: 0, revenue: 0, processedOrders: 0, processedRevenue: 0 });
      const e = map.get(c)!;
      e.orders += 1;
      e.revenue += o.amount;
      if (o.status === "confirmed") {
        e.processedOrders += 1;
        e.processedRevenue += o.amount;
      }
    }
    return Array.from(map.entries()).map(([code, e]) => {
      const feePerOrder = getFeeForCountry(code);
      const serviceFees = computeServiceFees(e.processedOrders, feePerOrder);
      return { country: code, countryName: COUNTRY_NAMES[code] || code, flag: COUNTRY_FLAGS[code] || "", netRevenue: e.processedRevenue - serviceFees, processedOrders: e.processedOrders, revenue: e.processedRevenue, deliveryRate: e.orders > 0 ? e.processedOrders / e.orders : 0 };
    }).sort((a, b) => b.netRevenue - a.netRevenue);
  }, [filteredOrders]);

  const bestCountry = useMemo(() => countryStats.length > 0 ? countryStats[0] : null, [countryStats]);

  const uniqueProductCount = useMemo(() => {
    const ids = new Set(filteredOrders.map((o) => o.productCode || o.productName).filter(Boolean));
    return ids.size;
  }, [filteredOrders]);

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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#141417] border border-[#27272A] transition-all duration-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#141417] border border-[#27272A] transition-all duration-200"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        </div>

        {/* Primary KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title={dateFilter === "all" ? "Total Orders" : `${DATE_FILTER_LABELS[dateFilter]} Orders`} value={formatNumber(filteredOrders.length)} icon={<ShoppingCart className="w-5 h-5" />} color="primary" delay={0} glass />
          <StatCard title={dateFilter === "all" ? "Total Revenue" : `${DATE_FILTER_LABELS[dateFilter]} Revenue`} value={formatCurrency(filteredRevenue)} icon={<DollarSign className="w-5 h-5" />} color="success" delay={50} glass />
          <StatCard title="Processed Orders" value={formatNumber(filteredProcessedOrders)} icon={<CheckCircle className="w-5 h-5" />} color="info" delay={100} subtitle="Paid by CodinAfrica" glass />
          <StatCard title="Processed Revenue" value={formatCurrency(filteredProcessedRevenue)} icon={<TrendingUp className="w-5 h-5" />} color="success" delay={150} subtitle="Real collected revenue" glass />
        </div>

        {/* Secondary KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Net Revenue" value={formatCurrency(filteredNetRevenue)} icon={<Shield className="w-5 h-5" />} color="success" delay={200} subtitle="After service fees" />
          <StatCard title="Service Fees" value={formatCurrency(filteredServiceFees)} icon={<Percent className="w-5 h-5" />} color="warning" delay={250} subtitle="CodinAfrica fees" />
          <StatCard title="Delivery Rate" value={formatPercentage(filteredDeliveryRate)} icon={<Activity className="w-5 h-5" />} color="info" delay={300} subtitle="Based on Processed" />
          <StatCard title="Confirmation Rate" value={formatPercentage(filteredConfRate)} icon={<Zap className="w-5 h-5" />} color="success" delay={350} />
        </div>

        {/* Tertiary KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Average Order Value" value={formatCurrency(filteredOrders.length > 0 ? filteredRevenue / filteredOrders.length : 0)} icon={<TrendingUp className="w-5 h-5" />} color="info" delay={400} />
          <StatCard title="Products Sold" value={formatNumber(uniqueProductCount)} icon={<Package className="w-5 h-5" />} color="primary" delay={450} subtitle="Unique in period" />
          <StatCard title="Pending" value={formatNumber(filteredPending)} icon={<Clock className="w-5 h-5" />} color="warning" delay={500} subtitle={`${filteredOrders.length > 0 ? ((filteredPending / filteredOrders.length) * 100).toFixed(1) : 0}% of total`} />
          <StatCard title="Confirmed Orders" value={formatNumber(filteredConfirmed)} icon={<CheckCircle className="w-5 h-5" />} color="success" delay={550} />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <RevenueChart data={filteredRevenueTrend} loading={isLoading} />
          <OrdersStatusChart stats={filteredStats} loading={isLoading} />
        </div>

        {/* Rankings Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card glass>
            <CardHeader>
              <CardTitle>Best Selling</CardTitle>
              <span className="text-[#71717A] text-xs font-medium">Top 5</span>
            </CardHeader>
            <div className="space-y-2">
              {topSelling.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-[#1C1C21] transition-all duration-200">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0 ? "bg-gradient-to-br from-[#F59E0B]/20 to-[#F59E0B]/5 text-[#F59E0B]" :
                      i === 1 ? "bg-gradient-to-br from-[#71717A]/20 to-[#71717A]/5 text-[#A1A1AA]" :
                      i === 2 ? "bg-gradient-to-br from-[#0EA5E9]/20 to-[#0EA5E9]/5 text-[#0EA5E9]" :
                      "bg-[#27272A] text-[#71717A]"
                    }`}>
                      {i + 1}
                    </div>
                    <p className="text-[#FAFAFA] text-sm truncate">{p.name}</p>
                  </div>
                  <span className="text-[#FAFAFA] text-sm font-medium shrink-0 ml-2">{formatNumber(p.totalSold)}</span>
                </div>
              ))}
              {topSelling.length === 0 && <p className="text-[#71717A] text-sm text-center py-4">No data</p>}
            </div>
          </Card>
          <Card glass>
            <CardHeader>
              <CardTitle>Highest Revenue</CardTitle>
              <span className="text-[#71717A] text-xs font-medium">Top 5</span>
            </CardHeader>
            <div className="space-y-2">
              {topRevenue.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-[#1C1C21] transition-all duration-200">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0 ? "bg-gradient-to-br from-[#10B981]/20 to-[#10B981]/5 text-[#10B981]" :
                      i === 1 ? "bg-gradient-to-br from-[#71717A]/20 to-[#71717A]/5 text-[#A1A1AA]" :
                      i === 2 ? "bg-gradient-to-br from-[#10B981]/20 to-[#10B981]/5 text-[#34D399]" :
                      "bg-[#27272A] text-[#71717A]"
                    }`}>
                      {i + 1}
                    </div>
                    <p className="text-[#FAFAFA] text-sm truncate">{p.name}</p>
                  </div>
                  <span className="text-[#10B981] text-sm font-medium shrink-0 ml-2">{formatCurrency(p.revenue)}</span>
                </div>
              ))}
              {topRevenue.length === 0 && <p className="text-[#71717A] text-sm text-center py-4">No data</p>}
            </div>
          </Card>
          <Card glass>
            <CardHeader>
              <CardTitle>Lowest Stock</CardTitle>
              <span className="text-[#71717A] text-xs font-medium">Needs attention</span>
            </CardHeader>
            <div className="space-y-2">
              {lowestStock.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-[#1C1C21] transition-all duration-200">
                  <p className="text-[#FAFAFA] text-sm truncate">{p.name}</p>
                  <span className={`text-sm font-medium shrink-0 ml-2 ${p.stockQuantity <= 3 ? "text-[#EF4444]" : "text-[#F59E0B]"}`}>
                    {formatNumber(p.stockQuantity)}
                  </span>
                </div>
              ))}
              {lowestStock.length === 0 && <p className="text-[#71717A] text-sm text-center py-4">All well stocked</p>}
            </div>
          </Card>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {bestCountry && (
            <Card className="bg-gradient-to-br from-[#10B981]/10 via-[#141417] to-[#141417] border-[#10B981]/20 glow-primary" hover={false}>
              <CardHeader>
                <CardTitle>Best Performing Country</CardTitle>
                <span className="text-[#10B981] text-xs font-medium">By Net Revenue</span>
              </CardHeader>
              <div className="flex items-center gap-5">
                {bestCountry.flag ? (
                  <img src={bestCountry.flag} alt={bestCountry.countryName} className="w-14 h-10 rounded-xl object-cover shadow-lg shadow-[#10B981]/10" />
                ) : (
                  <div className="w-14 h-10 rounded-xl bg-gradient-to-br from-[#10B981]/20 to-[#0EA5E9]/20 flex items-center justify-center">
                    <Globe className="w-6 h-6 text-[#34D399]" />
                  </div>
                )}
                <div>
                  <p className="text-2xl font-bold text-[#FAFAFA]">{bestCountry.countryName}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <div>
                      <p className="text-[#10B981] text-sm font-semibold">{formatCurrency(bestCountry.netRevenue)}</p>
                      <p className="text-[#71717A] text-[11px]">Net Revenue</p>
                    </div>
                    <div className="w-px h-8 bg-[#27272A]" />
                    <div>
                      <p className="text-[#FAFAFA] text-sm font-semibold">{formatNumber(bestCountry.processedOrders)}</p>
                      <p className="text-[#71717A] text-[11px]">Processed</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
          {bestProduct && (
            <Card className="bg-gradient-to-br from-[#10B981]/10 via-[#141417] to-[#141417] border-[#10B981]/20" hover={false}>
              <CardHeader>
                <CardTitle>Best Performing Product</CardTitle>
                <span className="text-[#10B981] text-xs font-medium">By Revenue</span>
              </CardHeader>
              <div className="flex items-center gap-4">
                {bestProduct.image ? (
                  <div className="w-16 h-16 rounded-xl bg-[#27272A] flex items-center justify-center shrink-0 overflow-hidden">
                    <img src={getImageUrlOrFallback(bestProduct.image)} alt={bestProduct.name} className="w-full h-full object-contain p-1" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-[#27272A] flex items-center justify-center shrink-0">
                    <Package className="w-6 h-6 text-[#71717A]" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold text-[#FAFAFA] truncate">{bestProduct.name}</p>
                  <div className="flex items-center gap-4 mt-1.5">
                    <div>
                      <p className="text-[#10B981] text-sm font-semibold">{formatCurrency(bestProduct.revenue)}</p>
                      <p className="text-[#71717A] text-[11px]">Revenue</p>
                    </div>
                    <div className="w-px h-7 bg-[#27272A]" />
                    <div>
                      <p className="text-[#FAFAFA] text-sm font-semibold">{formatNumber(bestProduct.totalSold)}</p>
                      <p className="text-[#71717A] text-[11px]">Sold</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
          <Card glass>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <span className="text-[#71717A] text-xs">Latest 5</span>
            </CardHeader>
            <div className="space-y-2">
              {filteredOrders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl border border-[#27272A]/50 hover:border-[#10B981]/20 hover:bg-[#1C1C21] transition-all duration-200 cursor-pointer group"
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#10B981]/10 to-[#0EA5E9]/10 flex items-center justify-center shrink-0">
                      <ShoppingCart className="w-3.5 h-3.5 text-[#34D399]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[#FAFAFA] text-sm font-medium truncate">{order.customerName}</p>
                      <p className="text-[#71717A] text-xs">{formatDate(order.date)}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3 shrink-0 ml-3">
                    <StatusBadge status={order.status} color={order.statusColor} />
                    <span className="text-[#FAFAFA] text-sm font-medium">{formatCurrency(order.amount)}</span>
                  </div>
                </div>
              ))}
              {filteredOrders.length === 0 && <p className="text-[#71717A] text-sm text-center py-4">No data</p>}
            </div>
          </Card>
        </div>
      </div>

      <OrderModal order={selectedOrder} open={!!selectedOrder} onClose={() => setSelectedOrder(null)} />
    </PageWrapper>
  );
}
