"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  ShoppingCart, CheckCircle, DollarSign, TrendingUp,
  Activity, Clock, Download, Eye, RefreshCw, Percent, Package, TrendingDown
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { OrdersStatusChart } from "@/components/charts/OrdersStatusChart";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageWrapper } from "@/components/PageWrapper";
import { OrderModal } from "@/components/OrderModal";
import { DateFilter } from "@/components/DateFilter";
import { MetaStatsCards } from "@/components/MetaStatsCards";
import { RecommendationsPanel } from "@/components/RecommendationsPanel";
import { useDashboardData } from "@/hooks";
import { useMetaAds } from "@/hooks/useMetaAds";
import { useRecommendations } from "@/hooks/useRecommendations";
import { formatCurrency, formatNumber, formatPercentage, formatDate, filterOrdersByDate, DATE_FILTER_LABELS, getImageUrlOrFallback, getFeeForCountry, computeServiceFees, COUNTRY_NAMES, COUNTRY_FLAGS } from "@/utils";
import { exportToCSV } from "@/utils/csv";
import type { DateFilterValue } from "@/utils/dates";
import type { DatePreset } from "@/types/meta";
import type { Order, Product, CodinAfricaShipping } from "@/types";

function getPreviousPeriodRange(filter: DateFilterValue): { start: string; end: string } | null {
  const now = new Date();
  if (filter === "today") {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
    return { start: yesterdayStart, end: todayStart };
  }
  if (filter === "yesterday") {
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
    const d2Start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2).toISOString();
    return { start: d2Start, end: yesterdayStart };
  }
  if (filter === "7d") {
    return { start: new Date(now.getTime() - 14 * 86400000).toISOString(), end: new Date(now.getTime() - 7 * 86400000).toISOString() };
  }
  if (filter === "30d") {
    return { start: new Date(now.getTime() - 60 * 86400000).toISOString(), end: new Date(now.getTime() - 30 * 86400000).toISOString() };
  }
  if (filter === "thisMonth") {
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    return { start: lastMonthStart, end: thisMonthStart };
  }
  if (filter === "thisYear") {
    const thisYearStart = new Date(now.getFullYear(), 0, 1).toISOString();
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1).toISOString();
    return { start: lastYearStart, end: thisYearStart };
  }
  return { start: new Date(now.getTime() - 60 * 86400000).toISOString(), end: new Date(now.getTime() - 30 * 86400000).toISOString() };
}

function computeTrend(current: number, previous: number): { value: number; isUp: boolean } | undefined {
  if (previous <= 0) return undefined;
  const pct = ((current - previous) / previous) * 100;
  return { value: Math.round(Math.abs(pct) * 10) / 10, isUp: pct >= 0 };
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useDashboardData();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("all");

  const orders = data?.orders ?? [];
  const allProducts = data?.products ?? [];
  const allShippings: CodinAfricaShipping[] = data?.shippings ?? [];
  const isLoading = loading && !data;

  const filteredOrders = useMemo(() => filterOrdersByDate(orders, dateFilter), [orders, dateFilter]);
  const filteredShippings = useMemo(() => filterOrdersByDate(allShippings, dateFilter), [allShippings, dateFilter]);

  const previousOrders = useMemo(() => {
    const range = getPreviousPeriodRange(dateFilter);
    if (!range) return [];
    return orders.filter((o) => {
      if (!o.date) return false;
      return o.date >= range.start && o.date < range.end;
    });
  }, [orders, dateFilter]);

  const filteredStatusCounts = useMemo(() => {
    let pending = 0, confirmed = 0, cancelled = 0;
    let outOfStock = 0, doubleOrd = 0, transferred = 0, unreached = 0;
    let confirmedCount = 0, nonCancelled = 0, processed = 0;
    let processedRevenue = 0, revenue = 0;

    for (const o of filteredOrders) {
      revenue += o.amount;
      if (o.status === "pending") { pending++; nonCancelled++; }
      else if (o.status === "confirmed" || o.status === "processed") { confirmed++; confirmedCount++; nonCancelled++; processed++; processedRevenue += o.amount; }
      else if (o.status === "delivered" || o.status === "shipping" || o.status === "shipped") { confirmedCount++; nonCancelled++; }
      else if (o.status === "cancelled") cancelled++;
      else if (o.status === "out_of_stock") outOfStock++;
      else if (o.status === "double") doubleOrd++;
      else if (o.status === "transferred") transferred++;
      else if (o.status === "unreached") unreached++;
    }

    const paid = filteredShippings.filter((s) => s.status === "processed").length;
    const delivered = filteredShippings.filter((s) => s.status === "delivered").length;
    const shipped = filteredShippings.filter((s) => s.status === "shipped").length;
    const returned = filteredShippings.filter((s) => s.status === "return").length;
    const totalDeliveredAttempts = paid + returned;
    const deliveryRate = totalDeliveredAttempts > 0 ? paid / totalDeliveredAttempts : 0;

    return {
      pendingOrders: pending, confirmedOrders: confirmedCount, deliveredOrders: paid,
      cancelledOrders: cancelled, outOfStockOrders: outOfStock, doubleOrders: doubleOrd,
      transferredOrders: transferred, unreachedOrders: unreached,
      returnedOrders: returned, shippedOrders: shipped, deliveredToCustomer: delivered,
      revenue,
      confirmedCount, nonCancelled, processedOrders: processed, processedRevenue,
      confRate: nonCancelled > 0 ? confirmedCount / nonCancelled : 0,
      deliveryRate,
    };
  }, [filteredOrders, filteredShippings]);

  const prevStats = useMemo(() => {
    let prevRevenue = 0, prevOrders = 0;
    let prevProcessed = 0, prevProcessedRevenue = 0;
    let prevPending = 0, prevConfirmed = 0, prevNonCancelled = 0;
    for (const o of previousOrders) {
      prevRevenue += o.amount;
      prevOrders++;
      if (o.status === "confirmed") {
        prevProcessed++; prevProcessedRevenue += o.amount; prevConfirmed++; prevNonCancelled++;
      } else if (o.status === "pending") { prevPending++; prevNonCancelled++; }
      else if (o.status === "delivered" || o.status === "shipping" || o.status === "shipped") { prevConfirmed++; prevNonCancelled++; }
    }
    return {
      prevRevenue, prevOrders, prevProcessed, prevProcessedRevenue,
      prevPending, prevConfirmed, prevNonCancelled,
    };
  }, [previousOrders]);

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

  const prevServiceFees = useMemo(() => {
    const byCountry = new Map<string, number>();
    for (const o of previousOrders) {
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
  }, [previousOrders]);

  const filteredNetRevenue = filteredStatusCounts.processedRevenue - filteredServiceFees;
  const prevNetRevenue = prevStats.prevProcessedRevenue - prevServiceFees;

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

  const avgOrderValue = filteredOrders.length > 0 ? filteredStatusCounts.revenue / filteredOrders.length : 0;
  const prevAvgOrderValue = prevStats.prevOrders > 0 ? prevStats.prevRevenue / prevStats.prevOrders : 0;

  const [metaDatePreset, setMetaDatePreset] = useState<DatePreset>("last_30d");
  const { data: metaData, loading: metaLoading, error: metaError, refresh: refreshMeta, hasCredentials: metaHasCreds } = useMetaAds(metaDatePreset);
  const { data: recData, loading: recLoading, refresh: refreshRecs, markRead } = useRecommendations(
    data?.stats ?? null,
    data?.countries ?? [],
    data?.products ?? [],
    metaData
  );

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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#64748B] hover:text-white hover:bg-[#111827] border border-[#1F2937]/80 transition-all duration-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              {t("common.refresh")}
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#64748B] hover:text-white hover:bg-[#111827] border border-[#1F2937]/80 transition-all duration-200"
            >
              <Download className="w-3.5 h-3.5" /> {t("common.export")}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={t("dashboard.totalOrders")}
            value={formatNumber(filteredOrders.length)}
            icon={<ShoppingCart className="w-5 h-5" />}
            color="primary"
            delay={0}
            loading={isLoading}
            tooltip={t("dashboard.totalOrdersTooltip")}
            trend={computeTrend(filteredOrders.length, prevStats.prevOrders)}
          />
          <StatCard
            title={t("dashboard.totalRevenue")}
            value={formatCurrency(filteredStatusCounts.revenue)}
            icon={<DollarSign className="w-5 h-5" />}
            color="success"
            delay={50}
            loading={isLoading}
            tooltip={t("dashboard.totalRevenueTooltip")}
            trend={computeTrend(filteredStatusCounts.revenue, prevStats.prevRevenue)}
          />
          <StatCard
            title={t("dashboard.processedOrders")}
            value={formatNumber(filteredStatusCounts.processedOrders)}
            icon={<CheckCircle className="w-5 h-5" />}
            color="primary"
            delay={100}
            subtitle={t("dashboard.paidByCodinAfrica")}
            loading={isLoading}
            tooltip={t("dashboard.processedOrdersTooltip")}
            trend={computeTrend(filteredStatusCounts.processedOrders, prevStats.prevProcessed)}
          />
          <StatCard
            title={t("dashboard.processedRevenue")}
            value={formatCurrency(filteredStatusCounts.processedRevenue)}
            icon={<TrendingUp className="w-5 h-5" />}
            color="success"
            delay={150}
            subtitle={t("dashboard.realCollectedRevenue")}
            loading={isLoading}
            tooltip={t("dashboard.processedRevenueTooltip")}
            trend={computeTrend(filteredStatusCounts.processedRevenue, prevStats.prevProcessedRevenue)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Delivered (COD Africa)"
            value={formatNumber(filteredStatusCounts.deliveredOrders)}
            icon={<CheckCircle className="w-5 h-5" />}
            color="success"
            delay={200}
            subtitle="status = processed (paid)"
            loading={isLoading}
          />
          <StatCard
            title="Delivered to Customer"
            value={formatNumber(filteredStatusCounts.deliveredToCustomer)}
            icon={<Package className="w-5 h-5" />}
            color="primary"
            delay={250}
            subtitle="status = delivered"
            loading={isLoading}
          />
          <StatCard
            title="Returned"
            value={formatNumber(filteredStatusCounts.returnedOrders)}
            icon={<TrendingDown className="w-5 h-5" />}
            color="error"
            delay={300}
            subtitle="status = return"
            loading={isLoading}
          />
          <StatCard
            title="Shipped"
            value={formatNumber(filteredStatusCounts.shippedOrders)}
            icon={<Package className="w-5 h-5" />}
            color="primary"
            delay={350}
            subtitle="status = shipped"
            loading={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={t("dashboard.netRevenue")}
            value={formatCurrency(filteredNetRevenue)}
            icon={<DollarSign className="w-5 h-5" />}
            color="success"
            delay={400}
            subtitle={t("dashboard.afterServiceFees")}
            loading={isLoading}
            tooltip={t("dashboard.netRevenueTooltip")}
            trend={computeTrend(filteredNetRevenue, prevNetRevenue)}
          />
          <StatCard
            title={t("dashboard.serviceFees")}
            value={formatCurrency(filteredServiceFees)}
            icon={<Percent className="w-5 h-5" />}
            color="warning"
            delay={450}
            subtitle={t("dashboard.codinAfricaFees")}
            loading={isLoading}
            tooltip={t("dashboard.serviceFeesTooltip")}
            trend={computeTrend(filteredServiceFees, prevServiceFees)}
          />
          <StatCard
            title={t("dashboard.deliveryRate")}
            value={formatPercentage(filteredStatusCounts.deliveryRate)}
            icon={<Activity className="w-5 h-5" />}
            color="primary"
            delay={300}
            subtitle={t("dashboard.basedOnProcessed")}
            loading={isLoading}
            tooltip={t("dashboard.deliveryRateTooltip")}
          />
          <StatCard
            title={t("dashboard.confirmationRate")}
            value={formatPercentage(filteredStatusCounts.confRate)}
            icon={<CheckCircle className="w-5 h-5" />}
            color="success"
            delay={550}
            loading={isLoading}
            tooltip={t("dashboard.confirmationRateTooltip")}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={t("dashboard.averageOrderValue")}
            value={formatCurrency(avgOrderValue)}
            icon={<TrendingUp className="w-5 h-5" />}
            color="primary"
            delay={600}
            loading={isLoading}
            tooltip={t("dashboard.avgOrderValueTooltip")}
            trend={computeTrend(avgOrderValue, prevAvgOrderValue)}
          />
          <StatCard
            title={t("dashboard.productsSold")}
            value={formatNumber(uniqueProductCount)}
            icon={<Package className="w-5 h-5" />}
            color="primary"
            delay={650}
            subtitle={t("dashboard.uniqueInPeriod")}
            loading={isLoading}
            tooltip={t("dashboard.productsSoldTooltip")}
          />
          <StatCard
            title={t("dashboard.pending")}
            value={formatNumber(filteredStatusCounts.pendingOrders)}
            icon={<Clock className="w-5 h-5" />}
            color="warning"
            delay={500}
            subtitle={`${filteredOrders.length > 0 ? ((filteredStatusCounts.pendingOrders / filteredOrders.length) * 100).toFixed(1) : 0}${t("dashboard.percentOfTotal")}`}
            loading={isLoading}
            tooltip={t("dashboard.pendingTooltip")}
            trend={computeTrend(filteredStatusCounts.pendingOrders, prevStats.prevPending)}
          />
          <StatCard
            title={t("dashboard.confirmedOrders")}
            value={formatNumber(filteredStatusCounts.confirmedOrders)}
            icon={<CheckCircle className="w-5 h-5" />}
            color="success"
            delay={550}
            loading={isLoading}
            tooltip={t("dashboard.confirmedOrdersTooltip")}
            trend={computeTrend(filteredStatusCounts.confirmedOrders, prevStats.prevConfirmed)}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <RevenueChart data={filteredRevenueTrend} loading={isLoading} />
          <OrdersStatusChart stats={filteredStatusCounts} loading={isLoading} />
        </div>

        <MetaStatsCards
          data={metaData}
          loading={metaLoading}
          error={metaError}
          onRefresh={(p) => { if (p) setMetaDatePreset(p); else refreshMeta(); }}
          onSetup={() => window.location.href = "/settings"}
          hasCredentials={metaHasCreds}
        />

        <RecommendationsPanel
          recommendations={recData?.recommendations ?? []}
          loading={recLoading}
          onRefresh={() => { refreshMeta(); refreshRecs(); }}
          onMarkRead={markRead}
          compact
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card gradient>
            <CardHeader>
              <CardTitle>{t("dashboard.bestSelling")}</CardTitle>
              <span className="text-[#94A3B8] text-xs font-medium">{t("dashboard.top5")}</span>
            </CardHeader>
            <div className="space-y-2">
              {topSelling.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[#1F2937]/50 transition-all duration-200">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0 ? "bg-[#f59e0b]/20 text-[#f59e0b]" : i === 1 ? "bg-[#94A3B8]/20 text-[#94A3B8]" : i === 2 ? "bg-[#8b5cf6]/20 text-[#8b5cf6]" : "bg-[#1F2937] text-[#64748B]"
                    }`}>
                      {i + 1}
                    </div>
                    <p className="text-white text-sm truncate">{p.name}</p>
                  </div>
                  <span className="text-white text-sm font-medium shrink-0 ms-2">{formatNumber(p.totalSold)}</span>
                </div>
              ))}
              {topSelling.length === 0 && <p className="text-[#64748B] text-sm text-center py-4">{t("common.noData")}</p>}
            </div>
          </Card>
          <Card gradient>
            <CardHeader>
              <CardTitle>{t("dashboard.highestRevenue")}</CardTitle>
              <span className="text-[#94A3B8] text-xs font-medium">{t("dashboard.top5")}</span>
            </CardHeader>
            <div className="space-y-2">
              {topRevenue.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[#1F2937]/50 transition-all duration-200">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0 ? "bg-[#10b981]/20 text-[#10b981]" : i === 1 ? "bg-[#94A3B8]/20 text-[#94A3B8]" : i === 2 ? "bg-[#6366F1]/20 text-[#6366F1]" : "bg-[#1F2937] text-[#64748B]"
                    }`}>
                      {i + 1}
                    </div>
                    <p className="text-white text-sm truncate">{p.name}</p>
                  </div>
                  <span className="text-[#10b981] text-sm font-medium shrink-0 ms-2">{formatCurrency(p.revenue)}</span>
                </div>
              ))}
              {topRevenue.length === 0 && <p className="text-[#64748B] text-sm text-center py-4">{t("common.noData")}</p>}
            </div>
          </Card>
          <Card gradient>
            <CardHeader>
              <CardTitle>{t("dashboard.lowestStock")}</CardTitle>
              <span className="text-[#94A3B8] text-xs font-medium">{t("dashboard.needsAttention")}</span>
            </CardHeader>
            <div className="space-y-2">
              {lowestStock.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[#1F2937]/50 transition-all duration-200">
                  <p className="text-white text-sm truncate">{p.name}</p>
                  <span className={`text-sm font-medium shrink-0 ms-2 ${p.stockQuantity <= 3 ? "text-[#ef4444]" : "text-[#f59e0b]"}`}>
                    {formatNumber(p.stockQuantity)}
                  </span>
                </div>
              ))}
              {lowestStock.length === 0 && <p className="text-[#64748B] text-sm text-center py-4">{t("dashboard.allWellStocked")}</p>}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {bestCountry && (
            <Card className="bg-gradient-to-br from-[#6366F1]/10 via-[#111827] to-[#111827] border-[#6366F1]/20" hover={false}>
              <CardHeader>
                <CardTitle>{t("dashboard.bestPerformingCountry")}</CardTitle>
                <span className="text-[#10b981] text-xs font-medium">{t("dashboard.byNetRevenue")}</span>
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
                      <p className="text-[#94A3B8] text-[11px]">{t("dashboard.netRevenue")}</p>
                    </div>
                    <div className="w-px h-8 bg-[#1F2937]/80" />
                    <div>
                      <p className="text-white text-sm font-semibold">{formatNumber(bestCountry.processedOrders)}</p>
                      <p className="text-[#94A3B8] text-[11px]">{t("dashboard.processed")}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
          {bestProduct && (
            <Card className="bg-gradient-to-br from-[#10b981]/10 via-[#111827] to-[#111827] border-[#10b981]/20" hover={false}>
              <CardHeader>
                <CardTitle>{t("dashboard.bestPerformingProduct")}</CardTitle>
                <span className="text-[#10b981] text-xs font-medium">{t("dashboard.byRevenue")}</span>
              </CardHeader>
              <div className="flex items-center gap-4">
                {bestProduct.image ? (
                  <div className="w-16 h-16 rounded-xl bg-[#1F2937] flex items-center justify-center shrink-0 overflow-hidden">
                    <img src={getImageUrlOrFallback(bestProduct.image)} alt={bestProduct.name} className="w-full h-full object-contain p-1" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-[#1F2937] flex items-center justify-center shrink-0">
                    <Package className="w-6 h-6 text-[#64748B]" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold text-white truncate">{bestProduct.name}</p>
                  <div className="flex items-center gap-4 mt-1.5">
                    <div>
                      <p className="text-[#10b981] text-sm font-semibold">{formatCurrency(bestProduct.revenue)}</p>
                      <p className="text-[#94A3B8] text-[11px]">{t("dashboard.byRevenue")}</p>
                    </div>
                    <div className="w-px h-7 bg-[#1F2937]/80" />
                    <div>
                      <p className="text-white text-sm font-semibold">{formatNumber(bestProduct.totalSold)}</p>
                      <p className="text-[#94A3B8] text-[11px]">{t("dashboard.sold")}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
          <Card gradient>
            <CardHeader>
              <CardTitle>{t("dashboard.recentOrders")}</CardTitle>
              <span className="text-[#94A3B8] text-xs">{t("dashboard.latest5")}</span>
            </CardHeader>
            <div className="space-y-2">
              {filteredOrders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-[#1F2937]/50 hover:border-[#6366F1]/20 hover:bg-[#1E293B] transition-all duration-200 cursor-pointer group"
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Eye className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#8B5CF6] shrink-0 transition-colors duration-200" />
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{order.customerName}</p>
                      <p className="text-[#94A3B8] text-xs">{formatDate(order.date)}</p>
                    </div>
                  </div>
                  <div className="text-end flex items-center gap-3 shrink-0 ms-3">
                    <StatusBadge status={order.status} color={order.statusColor} />
                    <span className="text-white text-sm font-medium">{formatCurrency(order.amount)}</span>
                  </div>
                </div>
              ))}
              {filteredOrders.length === 0 && <p className="text-[#64748B] text-sm text-center py-4">{t("common.noData")}</p>}
            </div>
          </Card>
        </div>
      </div>

      <OrderModal order={selectedOrder} open={!!selectedOrder} onClose={() => setSelectedOrder(null)} />
    </PageWrapper>
  );
}
