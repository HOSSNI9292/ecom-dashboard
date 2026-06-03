"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  TrendingUp, TrendingDown, Globe, Package, DollarSign,
  BarChart3, Download, RefreshCw, AlertTriangle,
  ShoppingCart, Users, CheckCircle, XCircle, Clock,
  ArrowUp, ArrowDown, Minus, Wallet, Activity,
  AlertCircle, ShieldAlert, Star, Info
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageWrapper } from "@/components/PageWrapper";
import { useDashboardData, useLowStockProducts, useOutOfStockProducts } from "@/hooks";
import { formatCurrency, formatNumber, formatPercentage, getFeeForCountry, computeServiceFees, COUNTRY_NAMES } from "@/utils";
import { exportToExcel } from "@/utils/excel";
import { exportToCSV } from "@/utils/csv";
import { getCached, setCache } from "@/utils/cache";
import type { ExcelColumn } from "@/utils/excel";
import type { CountryStats, Product, Order } from "@/types";

export default function ExecutiveBIPage() {
  const { data, loading, error, refetch } = useDashboardData({ refreshInterval: 300000 });
  const { data: lowStock } = useLowStockProducts();
  const { data: outOfStock } = useOutOfStockProducts();
  const [refreshing, setRefreshing] = useState(false);

  const isLoading = loading && !data;
  const orders = data?.orders ?? [];
  const products = data?.products ?? [];

  const countryStats = useMemo(() => {
    const map = new Map<string, {
      revenue: number; orders: number; confirmed: number;
      pending: number; cancelled: number; outOfStock: number;
      processedOrders: number; processedRevenue: number;
    }>();
    for (const o of orders) {
      const c = o.country || "XX";
      if (!map.has(c)) map.set(c, { revenue: 0, orders: 0, confirmed: 0, pending: 0, cancelled: 0, outOfStock: 0, processedOrders: 0, processedRevenue: 0 });
      const e = map.get(c)!;
      e.revenue += o.amount;
      e.orders += 1;
      if (o.status === "pending") e.pending += 1;
      else if (o.status === "cancelled") e.cancelled += 1;
      else if (o.status === "out_of_stock") e.outOfStock += 1;
      else if (o.status === "confirmed") e.confirmed += 1;
      if (o.status === "confirmed") { e.processedOrders += 1; e.processedRevenue += o.amount; }
    }
    return Array.from(map.entries()).map(([code, d]) => {
      const feePerOrder = getFeeForCountry(code);
      const serviceFees = computeServiceFees(d.processedOrders, feePerOrder);
      const nonCancelled = d.orders - d.cancelled - d.outOfStock;
      return {
        country: code, countryName: COUNTRY_NAMES[code] || code, flag: "", currency: "XOF",
        revenue: d.revenue, orders: d.orders, confirmed: d.confirmed, pending: d.pending,
        cancelled: d.cancelled, outOfStock: d.outOfStock,
        processedOrders: d.processedOrders, processedRevenue: d.processedRevenue,
        grossRevenue: d.processedRevenue, feePerOrder, serviceFees,
        netRevenue: d.processedRevenue - serviceFees,
        confirmationRate: nonCancelled > 0 ? d.confirmed / nonCancelled : 0,
        deliveryRate: d.orders > 0 ? d.processedOrders / d.orders : 0,
      } as CountryStats;
    }).sort((a, b) => b.revenue - a.revenue);
  }, [orders]);

  const finStats = useMemo(() => {
    const grossRevenue = orders.reduce((s, o) => s + o.amount, 0);
    const processedOrders = orders.filter((o) => o.status === "confirmed");
    const processedRevenue = processedOrders.reduce((s, o) => s + o.amount, 0);
    const confirmed = orders.filter((o) => o.status === "confirmed" || o.status === "delivered" || o.status === "shipping").length;
    const totalFees = countryStats.reduce((s, c) => s + c.serviceFees, 0);
    const netRevenue = processedRevenue - totalFees;
    const margin = processedRevenue > 0 ? netRevenue / processedRevenue : 0;
    return { grossRevenue, processedRevenue, netRevenue, totalFees, margin, confirmed, processedOrders: processedOrders.length };
  }, [orders, countryStats]);

  const productAgg = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) {
      const key = p.id;
      if (map.has(key)) { const ex = map.get(key)!; ex.totalSold += p.totalSold; ex.revenue += p.revenue; ex.stockQuantity = Math.max(ex.stockQuantity, p.stockQuantity); if (!ex.image && p.image) ex.image = p.image; }
      else { map.set(key, { ...p }); }
    }
    return Array.from(map.values());
  }, [products]);

  const topSelling = useMemo(() => [...productAgg].sort((a, b) => b.totalSold - a.totalSold).slice(0, 10), [productAgg]);
  const topRevenue = useMemo(() => [...productAgg].sort((a, b) => b.revenue - a.revenue).slice(0, 10), [productAgg]);
  const lowStockProducts = useMemo(() => productAgg.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= 10).sort((a, b) => a.stockQuantity - b.stockQuantity), [productAgg]);
  const outOfStockProducts = useMemo(() => productAgg.filter((p) => p.stockQuantity === 0).sort((a, b) => a.name.localeCompare(b.name)), [productAgg]);

  const kpi = useMemo(() => {
    const dates = orders.map((o) => o.date?.substring(0, 10)).filter(Boolean);
    const uniqueDays = new Set(dates).size || 1;
    const totalRevenue = orders.reduce((s, o) => s + o.amount, 0);
    const avgRevenuePerDay = totalRevenue / uniqueDays;
    const avgOrdersPerDay = orders.length / uniqueDays;
    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString().substring(0, 10);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000).toISOString().substring(0, 10);
    const recentOrders = orders.filter((o) => o.date >= thirtyDaysAgo);
    const prevOrders = orders.filter((o) => o.date >= sixtyDaysAgo && o.date < thirtyDaysAgo);
    const recentRevenue = recentOrders.reduce((s, o) => s + o.amount, 0);
    const prevRevenue = prevOrders.reduce((s, o) => s + o.amount, 0);
    const revenueGrowth = prevRevenue > 0 ? (recentRevenue - prevRevenue) / prevRevenue : 0;
    const orderGrowth = prevOrders.length > 0 ? (recentOrders.length - prevOrders.length) / prevOrders.length : 0;

    return { avgRevenuePerDay, avgOrdersPerDay, avgOrderValue, revenueGrowth, orderGrowth, totalDays: uniqueDays };
  }, [orders]);

  const alerts = useMemo(() => {
    const list: { type: "warning" | "danger" | "info"; icon: typeof AlertTriangle; title: string; message: string }[] = [];
    for (const p of lowStockProducts.slice(0, 5)) {
      list.push({ type: "warning", icon: AlertTriangle, title: `Low Stock: ${p.name}`, message: `Only ${p.stockQuantity} units left (${formatNumber(p.totalSold)} sold)` });
    }
    for (const p of outOfStockProducts.slice(0, 5)) {
      list.push({ type: "danger", icon: XCircle, title: `Out of Stock: ${p.name}`, message: `Product is out of stock (${formatNumber(p.totalSold)} sold)` });
    }
    for (const c of countryStats) {
      if (c.confirmationRate < 0.2 && c.orders > 5) {
        list.push({ type: "danger", icon: ShieldAlert, title: `Low Confirmation: ${c.countryName}`, message: `${formatPercentage(c.confirmationRate)} confirmation rate (${c.orders} orders)` });
      } else if (c.confirmationRate < 0.4 && c.orders > 5) {
        list.push({ type: "warning", icon: AlertTriangle, title: `Low Confirmation: ${c.countryName}`, message: `${formatPercentage(c.confirmationRate)} confirmation rate (${c.orders} orders)` });
      }
    }
    return list;
  }, [lowStockProducts, outOfStockProducts, countryStats]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  const handleExportCSV = useCallback(() => {
    exportToCSV(
      countryStats.map((c) => ({
        country: c.countryName, revenue: c.revenue, orders: c.orders,
        processedRevenue: c.processedRevenue, processedOrders: c.processedOrders,
        confirmationRate: `${(c.confirmationRate * 100).toFixed(1)}%`,
        deliveryRate: `${(c.deliveryRate * 100).toFixed(1)}%`,
        netRevenue: c.netRevenue, serviceFees: c.serviceFees,
      })),
      "executive_bi",
      { country: "Country", revenue: "Revenue", orders: "Orders", processedRevenue: "Processed Revenue", processedOrders: "Processed Orders", confirmationRate: "Confirmation Rate", deliveryRate: "Delivery Rate", netRevenue: "Net Revenue", serviceFees: "Service Fees" }
    );
  }, [countryStats]);

  const handleExportExcel = useCallback(() => {
    const cols: ExcelColumn[] = [
      { key: "country", label: "Country" }, { key: "revenue", label: "Revenue" },
      { key: "orders", label: "Orders" }, { key: "processedRevenue", label: "Processed Revenue" },
      { key: "processedOrders", label: "Processed Orders" }, { key: "netRevenue", label: "Net Revenue" },
      { key: "serviceFees", label: "Service Fees" }, { key: "confirmationRate", label: "Confirmation Rate" },
      { key: "deliveryRate", label: "Delivery Rate" },
    ];
    exportToExcel(countryStats.map((c) => ({
      country: c.countryName, revenue: formatCurrency(c.revenue), orders: c.orders,
      processedRevenue: formatCurrency(c.processedRevenue), processedOrders: c.processedOrders,
      netRevenue: formatCurrency(c.netRevenue), serviceFees: formatCurrency(c.serviceFees),
      confirmationRate: `${(c.confirmationRate * 100).toFixed(1)}%`,
      deliveryRate: `${(c.deliveryRate * 100).toFixed(1)}%`,
    })), "executive_bi", cols);
  }, [countryStats]);

  const maxRev = useMemo(() => Math.max(...countryStats.map((c) => c.revenue), 1), [countryStats]);
  const maxProc = useMemo(() => Math.max(...countryStats.map((c) => c.processedRevenue), 1), [countryStats]);

  return (
    <PageWrapper loading={isLoading} error={error} onRetry={refetch} hasData={!!data}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#10B981]/10">
              <BarChart3 className="w-6 h-6 text-[#34D399]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Executive BI</h1>
              <p className="text-[#71717A] text-xs">Comprehensive business intelligence & analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRefresh} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#71717A] hover:text-white hover:bg-[#141417] border border-[#27272A] transition-all duration-200">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#71717A] hover:text-white hover:bg-[#141417] border border-[#27272A] transition-all duration-200">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#71717A] hover:text-white hover:bg-[#141417] border border-[#27272A] transition-all duration-200">
              <Download className="w-3.5 h-3.5" /> Excel
            </button>
          </div>
        </div>

        {/* 1. Financial Analytics */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-[#34D399]" />
            <h2 className="text-white text-sm font-semibold">Financial Analytics</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-4 rounded-xl bg-[#141417] border border-[#27272A]">
              <p className="text-[#71717A] text-xs mb-1">Gross Revenue</p>
              <p className="text-white text-lg font-bold">{formatCurrency(finStats.grossRevenue)}</p>
              <p className="text-[#71717A] text-[10px] mt-1">All orders total</p>
            </div>
            <div className="p-4 rounded-xl bg-[#141417] border border-[#27272A]">
              <p className="text-[#71717A] text-xs mb-1">Processed Revenue</p>
              <p className="text-[#34D399] text-lg font-bold">{formatCurrency(finStats.processedRevenue)}</p>
              <p className="text-[#71717A] text-[10px] mt-1">{finStats.processedOrders} confirmed orders</p>
            </div>
            <div className="p-4 rounded-xl bg-[#141417] border border-[#27272A]">
              <p className="text-[#71717A] text-xs mb-1">Service Fees</p>
              <p className="text-[#EF4444] text-lg font-bold">{formatCurrency(finStats.totalFees)}</p>
              <p className="text-[#71717A] text-[10px] mt-1">CodinAfrica fees</p>
            </div>
            <div className="p-4 rounded-xl bg-[#141417] border border-[#27272A]">
              <p className="text-[#71717A] text-xs mb-1">Net Revenue</p>
              <p className="text-[#10B981] text-lg font-bold">{formatCurrency(finStats.netRevenue)}</p>
              <p className="text-[#71717A] text-[10px] mt-1">After service fees</p>
            </div>
            <div className="p-4 rounded-xl bg-[#141417] border border-[#27272A]">
              <p className="text-[#71717A] text-xs mb-1">Profit Margin</p>
              <p className={`text-lg font-bold ${finStats.margin >= 0.85 ? "text-[#10B981]" : finStats.margin >= 0.75 ? "text-[#F59E0B]" : "text-[#EF4444]"}`}>{formatPercentage(finStats.margin)}</p>
              <p className="text-[#71717A] text-[10px] mt-1">Net / Processed</p>
            </div>
          </div>
        </div>

        {/* 4. Advanced KPIs */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-[#34D399]" />
            <h2 className="text-white text-sm font-semibold">Advanced KPIs</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="p-3 rounded-xl bg-[#141417] border border-[#27272A]">
              <p className="text-[#71717A] text-[10px] mb-1">Avg Revenue / Day</p>
              <p className="text-white text-sm font-bold">{formatCurrency(kpi.avgRevenuePerDay)}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#141417] border border-[#27272A]">
              <p className="text-[#71717A] text-[10px] mb-1">Avg Orders / Day</p>
              <p className="text-white text-sm font-bold">{kpi.avgOrdersPerDay.toFixed(1)}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#141417] border border-[#27272A]">
              <p className="text-[#71717A] text-[10px] mb-1">Avg Order Value</p>
              <p className="text-white text-sm font-bold">{formatCurrency(kpi.avgOrderValue)}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#141417] border border-[#27272A]">
              <p className="text-[#71717A] text-[10px] mb-1">Revenue Growth</p>
              <div className="flex items-center gap-1">
                {kpi.revenueGrowth > 0 ? <ArrowUp className="w-3.5 h-3.5 text-[#10B981]" /> : kpi.revenueGrowth < 0 ? <ArrowDown className="w-3.5 h-3.5 text-[#EF4444]" /> : <Minus className="w-3.5 h-3.5 text-[#71717A]" />}
                <span className={`text-sm font-bold ${kpi.revenueGrowth > 0 ? "text-[#10B981]" : kpi.revenueGrowth < 0 ? "text-[#EF4444]" : "text-white"}`}>{formatPercentage(kpi.revenueGrowth)}</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#141417] border border-[#27272A]">
              <p className="text-[#71717A] text-[10px] mb-1">Order Growth</p>
              <div className="flex items-center gap-1">
                {kpi.orderGrowth > 0 ? <ArrowUp className="w-3.5 h-3.5 text-[#10B981]" /> : kpi.orderGrowth < 0 ? <ArrowDown className="w-3.5 h-3.5 text-[#EF4444]" /> : <Minus className="w-3.5 h-3.5 text-[#71717A]" />}
                <span className={`text-sm font-bold ${kpi.orderGrowth > 0 ? "text-[#10B981]" : kpi.orderGrowth < 0 ? "text-[#EF4444]" : "text-white"}`}>{formatPercentage(kpi.orderGrowth)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 1. Country Performance Ranking */}
        <Card hover={false}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#34D399]" />
              <CardTitle>Country Performance Ranking</CardTitle>
            </div>
            <span className="text-[#71717A] text-xs">{countryStats.length} countries</span>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#27272A]">
                  <th className="text-left text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3 px-3">#</th>
                  <th className="text-left text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3 px-3">Country</th>
                  <th className="text-right text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3 px-3">Revenue</th>
                  <th className="text-right text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3 px-3">Orders</th>
                  <th className="text-right text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3 px-3">Proc. Revenue</th>
                  <th className="text-right text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3 px-3">Net Revenue</th>
                  <th className="text-right text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3 px-3">Conf. Rate</th>
                  <th className="text-right text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3 px-3">Del. Rate</th>
                </tr>
              </thead>
              <tbody>
                {countryStats.map((c, i) => (
                  <tr key={c.country} className="border-b border-[#27272A]/50 hover:bg-[#1A1A1A] transition-all duration-150">
                    <td className="py-3 px-3 text-[#71717A] text-sm">{i + 1}</td>
                    <td className="py-3 px-3"><span className="text-white font-medium text-sm">{c.countryName}</span></td>
                    <td className="py-3 px-3 text-right text-white text-sm">{formatCurrency(c.revenue)}</td>
                    <td className="py-3 px-3 text-right text-[#A1A1AA] text-sm">{formatNumber(c.orders)}</td>
                    <td className="py-3 px-3 text-right text-[#34D399] text-sm">{formatCurrency(c.processedRevenue)}</td>
                    <td className="py-3 px-3 text-right text-[#10B981] text-sm font-medium">{formatCurrency(c.netRevenue)}</td>
                    <td className="py-3 px-3 text-right">
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                        c.confirmationRate >= 0.5 ? "bg-[#10B981]/20 text-[#10B981]" :
                        c.confirmationRate >= 0.2 ? "bg-[#F59E0B]/20 text-[#F59E0B]" : "bg-[#EF4444]/20 text-[#EF4444]"
                      }`}>{formatPercentage(c.confirmationRate)}</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                        c.deliveryRate >= 0.5 ? "bg-[#10B981]/20 text-[#10B981]" :
                        c.deliveryRate >= 0.2 ? "bg-[#F59E0B]/20 text-[#F59E0B]" : "bg-[#EF4444]/20 text-[#EF4444]"
                      }`}>{formatPercentage(c.deliveryRate)}</span>
                    </td>
                  </tr>
                ))}
                {countryStats.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-12 text-[#71717A]">No country data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 3. Product Analytics */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-[#34D399]" />
            <h2 className="text-white text-sm font-semibold">Product Analytics</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card hover={false}>
              <CardHeader><CardTitle>Top 10 Selling Products</CardTitle><span className="text-[#34D399] text-xs">{topSelling.length} products</span></CardHeader>
              <div className="space-y-1.5">
                {topSelling.map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[#1A1A1A] transition-all duration-150">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-[#71717A] text-xs w-4 shrink-0">{i + 1}</span>
                      <div className="w-8 h-8 rounded-lg bg-[#27272A] flex items-center justify-center shrink-0 overflow-hidden">
                        {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" crossOrigin="anonymous" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <Package className="w-4 h-4 text-[#71717A]" />}
                      </div>
                      <p className="text-white text-xs truncate">{p.name}</p>
                    </div>
                    <span className="text-white text-xs font-semibold shrink-0 ml-2">{formatNumber(p.totalSold)}</span>
                  </div>
                ))}
                {topSelling.length === 0 && <p className="text-center py-6 text-[#71717A] text-sm">No data</p>}
              </div>
            </Card>
            <Card hover={false}>
              <CardHeader><CardTitle>Top 10 Revenue Products</CardTitle><span className="text-[#34D399] text-xs">{topRevenue.length} products</span></CardHeader>
              <div className="space-y-1.5">
                {topRevenue.map((p, i) => {
                  const maxR = topRevenue[0]?.revenue || 1;
                  return (
                    <div key={p.id} className="py-2 px-3 rounded-lg hover:bg-[#1A1A1A] transition-all duration-150">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="text-[#71717A] text-xs w-4 shrink-0">{i + 1}</span>
                          <div className="w-8 h-8 rounded-lg bg-[#27272A] flex items-center justify-center shrink-0 overflow-hidden">
                            {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" crossOrigin="anonymous" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <Package className="w-4 h-4 text-[#71717A]" />}
                          </div>
                          <p className="text-white text-xs truncate">{p.name}</p>
                        </div>
                        <span className="text-white text-xs font-semibold shrink-0 ml-2">{formatCurrency(p.revenue)}</span>
                      </div>
                      <div className="w-full h-1 bg-[#27272A] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#10B981]" style={{ width: `${(p.revenue / maxR) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
                {topRevenue.length === 0 && <p className="text-center py-6 text-[#71717A] text-sm">No data</p>}
              </div>
            </Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <Card hover={false}>
              <CardHeader><CardTitle>Low Stock Products</CardTitle><span className="text-[#F59E0B] text-xs">{lowStockProducts.length} items</span></CardHeader>
              <div className="space-y-1.5">
                {lowStockProducts.slice(0, 8).map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#F59E0B]/5 border border-[#F59E0B]/10">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0" />
                      <p className="text-white text-xs truncate">{p.name}</p>
                    </div>
                    <span className="text-[#F59E0B] text-xs font-bold">{formatNumber(p.stockQuantity)}</span>
                  </div>
                ))}
                {lowStockProducts.length === 0 && <p className="text-center py-6 text-[#10B981] text-sm">All products well stocked</p>}
              </div>
            </Card>
            <Card hover={false}>
              <CardHeader><CardTitle>Out of Stock Products</CardTitle><span className="text-[#EF4444] text-xs">{outOfStockProducts.length} items</span></CardHeader>
              <div className="space-y-1.5">
                {outOfStockProducts.slice(0, 8).map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#EF4444]/5 border border-[#EF4444]/10">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <XCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
                      <p className="text-white text-xs truncate">{p.name}</p>
                    </div>
                    <span className="text-[#EF4444] text-xs font-bold">0</span>
                  </div>
                ))}
                {outOfStockProducts.length === 0 && <p className="text-center py-6 text-[#10B981] text-sm">No out of stock products</p>}
              </div>
            </Card>
          </div>
        </div>

        {/* 5. Smart Alerts */}
        {alerts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-[#F59E0B]" />
              <h2 className="text-white text-sm font-semibold">Smart Alerts ({alerts.length})</h2>
            </div>
            <div className="space-y-2">
              {alerts.slice(0, 10).map((alert, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${
                  alert.type === "danger" ? "bg-[#EF4444]/5 border-[#EF4444]/20" :
                  alert.type === "warning" ? "bg-[#F59E0B]/5 border-[#F59E0B]/20" :
                  "bg-[#34D399]/5 border-[#34D399]/20"
                }`}>
                  <alert.icon className={`w-5 h-5 mt-0.5 shrink-0 ${
                    alert.type === "danger" ? "text-[#EF4444]" :
                    alert.type === "warning" ? "text-[#F59E0B]" : "text-[#34D399]"
                  }`} />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium">{alert.title}</p>
                    <p className="text-[#71717A] text-xs mt-0.5">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
