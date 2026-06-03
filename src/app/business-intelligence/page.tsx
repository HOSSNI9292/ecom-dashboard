"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Download, TrendingDown, Globe, Package,
  CheckCircle, BarChart3, DollarSign,
  ShoppingCart, Users, Phone, MapPin
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { PageWrapper } from "@/components/PageWrapper";
import { DateFilter } from "@/components/DateFilter";
import { useDashboardData } from "@/hooks";
import { formatCurrency, formatNumber, formatPercentage, filterOrdersByDate, getFeeForCountry, computeServiceFees, COUNTRY_NAMES } from "@/utils";
import { exportToExcel } from "@/utils/excel";
import type { ExcelColumn } from "@/utils/excel";
import type { DateFilterValue } from "@/utils/dates";
import type { CountryStats, Product, Order } from "@/types";

export default function BusinessIntelligencePage() {
  const { data, loading, error, refetch } = useDashboardData();
  const [activeTab, setActiveTab] = useState("profit");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("all");
  const isLoading = loading && !data;

  const allOrders = data?.orders ?? [];
  const filteredOrders = useMemo(() => filterOrdersByDate(allOrders, dateFilter), [allOrders, dateFilter]);

  const aggregated = useMemo(() => {
    const map = new Map<string, Product & { _country?: string }>();
    for (const o of filteredOrders as Order[]) {
      const key = o.productCode || o.productName;
      if (!key) continue;
      if (map.has(key)) {
        const ex = map.get(key)!;
        ex.totalSold += o.quantity;
        ex.revenue += o.amount;
        if (o.productImage) ex.image = o.productImage;
      } else {
        map.set(key, {
          id: key,
          name: o.productName,
          code: o.productCode || "",
          totalSold: o.quantity,
          revenue: o.amount,
          stockQuantity: 999,
          warehouse: "",
          country: o.country,
          countryName: o.countryName || COUNTRY_NAMES[o.country] || o.country,
          currency: "XOF",
          price: o.quantity > 0 ? Math.round(o.amount / o.quantity) : 0,
          image: o.productImage,
        });
      }
    }
    return Array.from(map.values());
  }, [filteredOrders]);

  const filteredCountries = useMemo(() => {
    const map = new Map<string, {
      country: string; revenue: number; orders: number; confirmed: number;
      pending: number; cancelled: number; outOfStock: number;
      processedOrders: number; processedRevenue: number;
    }>();
    for (const o of filteredOrders as Order[]) {
      const c = o.country || "XX";
      if (!map.has(c)) map.set(c, { country: c, revenue: 0, orders: 0, confirmed: 0, pending: 0, cancelled: 0, outOfStock: 0, processedOrders: 0, processedRevenue: 0 });
      const e = map.get(c)!;
      e.revenue += o.amount;
      e.orders += 1;
      if (o.status === "pending") e.pending += 1;
      else if (o.status === "cancelled") e.cancelled += 1;
      else if (o.status === "out_of_stock") e.outOfStock += 1;
      else if (o.status === "confirmed") e.confirmed += 1;
      if (o.status === "confirmed") {
        e.processedOrders += 1;
        e.processedRevenue += o.amount;
      }
    }
    return Array.from(map.entries()).map(([code, d]) => {
      const feePerOrder = getFeeForCountry(code);
      const serviceFees = computeServiceFees(d.processedOrders, feePerOrder);
      const nonCancelled = d.orders - d.cancelled - d.outOfStock;
      return {
        ...d,
        countryName: COUNTRY_NAMES[code] || code,
        flag: "",
        currency: "XOF",
        grossRevenue: d.processedRevenue,
        feePerOrder,
        serviceFees,
        netRevenue: d.processedRevenue - serviceFees,
        confirmationRate: nonCancelled > 0 ? d.confirmed / nonCancelled : 0,
        deliveryRate: d.orders > 0 ? d.processedOrders / d.orders : 0,
      } as CountryStats;
    }).sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders]);

  const filteredTrend = useMemo(() => {
    const dayMap = new Map<string, { revenue: number; orders: number }>();
    for (const o of filteredOrders as Order[]) {
      const day = o.date?.substring(0, 10);
      if (!day) continue;
      if (!dayMap.has(day)) dayMap.set(day, { revenue: 0, orders: 0 });
      const e = dayMap.get(day)!;
      e.revenue += o.amount;
      e.orders += 1;
    }
    return Array.from(dayMap.entries()).map(([date, d]) => ({ date, ...d })).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredOrders]);

  const topProducts = useMemo(() =>
    [...aggregated].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
  [aggregated]);

  const worstProducts = useMemo(() =>
    [...aggregated]
      .filter((p) => p.revenue > 0 && p.totalSold > 0)
      .sort((a, b) => a.revenue - b.revenue)
      .slice(0, 10),
  [aggregated]);

  const topCountries = useMemo(() => filteredCountries.slice(0, 10), [filteredCountries]);

  const lowStockData = useMemo(() =>
    aggregated.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= 10).sort((a, b) => a.stockQuantity - b.stockQuantity),
  [aggregated]);

  const processedByCountry = useMemo(() =>
    [...filteredCountries].sort((a, b) => b.processedOrders - a.processedOrders),
  [filteredCountries]);

  const confirmationByCountry = useMemo(() =>
    [...filteredCountries].sort((a, b) => b.confirmationRate - a.confirmationRate),
  [filteredCountries]);

  const netRevenueByCountry = useMemo(() =>
    [...filteredCountries].sort((a, b) => b.netRevenue - a.netRevenue),
  [filteredCountries]);

  const topCustomers = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; country: string; countryName: string; orders: number; revenue: number; products: Set<string> }>();
    for (const o of filteredOrders as Order[]) {
      const key = o.phone || o.customerName;
      if (!key) continue;
      if (!map.has(key)) map.set(key, { name: o.customerName, phone: o.phone, country: o.country, countryName: o.countryName || COUNTRY_NAMES[o.country] || o.country, orders: 0, revenue: 0, products: new Set() });
      const c = map.get(key)!;
      c.orders += 1;
      c.revenue += o.amount;
      if (o.productName) c.products.add(o.productName);
    }
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filteredOrders]);

  const maxRevenue = useMemo(() => Math.max(...topCountries.map((c) => c.revenue), 1), [topCountries]);
  const maxProcessed = useMemo(() => Math.max(...processedByCountry.map((c) => c.processedOrders), 1), [processedByCountry]);
  const maxProductRevenue = useMemo(() => Math.max(...topProducts.map((p) => p.revenue), 1), [topProducts]);

  const handleExport = useCallback(() => {
    const ordersCols: ExcelColumn[] = [
      { key: "orderId", label: "Order ID" },
      { key: "customerName", label: "Customer" },
      { key: "phone", label: "Phone" },
      { key: "country", label: "Country" },
      { key: "productName", label: "Product" },
      { key: "amount", label: "Amount (XOF)" },
      { key: "status", label: "Status" },
      { key: "date", label: "Date" },
    ];
    exportToExcel(
      (filteredOrders as Order[]).map((o) => ({
        orderId: o.orderId,
        customerName: o.customerName,
        phone: o.phone,
        country: o.countryName || o.country,
        productName: o.productName,
        amount: o.amount,
        status: o.status,
        date: o.date?.substring(0, 10),
      })),
      "bi_orders",
      ordersCols
    );
  }, [filteredOrders]);

  const handleExportCountries = useCallback(() => {
    const cols: ExcelColumn[] = [
      { key: "countryName", label: "Country" },
      { key: "revenue", label: "Revenue (XOF)" },
      { key: "processedRevenue", label: "Processed Revenue (XOF)" },
      { key: "netRevenue", label: "Net Revenue (XOF)" },
      { key: "serviceFees", label: "Service Fees (XOF)" },
      { key: "feePerOrder", label: "Fee/Order (XOF)" },
      { key: "orders", label: "Orders" },
      { key: "processedOrders", label: "Processed Orders" },
      { key: "confirmationRate", label: "Confirmation Rate" },
      { key: "deliveryRate", label: "Delivery Rate" },
    ];
    exportToExcel(
      filteredCountries.map((c) => ({
        ...c,
        confirmationRate: `${(c.confirmationRate * 100).toFixed(1)}%`,
        deliveryRate: `${(c.deliveryRate * 100).toFixed(1)}%`,
      })),
      "bi_countries",
      cols
    );
  }, [filteredCountries]);

  const handleExportProducts = useCallback(() => {
    const cols: ExcelColumn[] = [
      { key: "name", label: "Product" },
      { key: "code", label: "Code" },
      { key: "revenue", label: "Revenue (XOF)" },
      { key: "totalSold", label: "Sold" },
      { key: "stockQuantity", label: "Stock" },
      { key: "price", label: "Price (XOF)" },
    ];
    exportToExcel(
      topProducts.map((p) => ({
        name: p.name,
        code: p.code,
        revenue: formatCurrency(p.revenue),
        totalSold: p.totalSold,
        stockQuantity: p.stockQuantity,
        price: formatCurrency(p.price),
      })),
      "bi_products",
      cols
    );
  }, [topProducts]);

  const tabBtn = (key: string, label: string) => (
    <button
      onClick={() => setActiveTab(key)}
      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
        activeTab === key
          ? "bg-[#10B981] text-white shadow-[0_0_12px_rgba(99,102,241,0.3)]"
          : "text-[#71717A] hover:text-white"
      }`}
    >
      {label}
    </button>
  );

  return (
    <PageWrapper loading={isLoading} error={error} onRetry={refetch} hasData={!!data}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#10B981]/10">
              <BarChart3 className="w-5 h-5 text-[#34D399]" />
            </div>
            <h1 className="text-xl font-bold text-white">Business Intelligence</h1>
          </div>
          <DateFilter value={dateFilter} onChange={setDateFilter} />
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#71717A] hover:text-white hover:bg-[#141417] border border-[#27272A] transition-all duration-200"
            >
              <Download className="w-3.5 h-3.5" /> Export Orders
            </button>
            <button
              onClick={handleExportCountries}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#71717A] hover:text-white hover:bg-[#141417] border border-[#27272A] transition-all duration-200"
            >
              <Download className="w-3.5 h-3.5" /> Export Countries
            </button>
            <button
              onClick={handleExportProducts}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#71717A] hover:text-white hover:bg-[#141417] border border-[#27272A] transition-all duration-200"
            >
              <Download className="w-3.5 h-3.5" /> Export Products
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#141417] border border-[#27272A] rounded-lg p-1 overflow-x-auto">
          {tabBtn("profit", "Profit Analytics")}
          {tabBtn("revenue", "Revenue Trends")}
          {tabBtn("countries", "Revenue by Country")}
          {tabBtn("net", "Net Revenue by Country")}
          {tabBtn("products", "Top Products")}
          {tabBtn("worst", "Worst Products")}
          {tabBtn("confirmation", "Confirmation Rate")}
          {tabBtn("processed", "Processed Orders")}
          {tabBtn("customers", "Top Customers")}
          {tabBtn("stock", "Low Stock")}
        </div>

        {/* Profit Analytics */}
        {activeTab === "profit" && (
          <div className="space-y-4">
            {(() => {
              const totalProcessed = filteredCountries.reduce((s, c) => s + c.processedRevenue, 0);
              const totalFees = filteredCountries.reduce((s, c) => s + c.serviceFees, 0);
              const totalNet = filteredCountries.reduce((s, c) => s + c.netRevenue, 0);
              const margin = totalProcessed > 0 ? totalNet / totalProcessed : 0;
              return (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-[#141417] border border-[#27272A]">
                      <p className="text-[#71717A] text-xs font-medium mb-1">Gross Revenue</p>
                      <p className="text-white text-xl font-bold">{formatCurrency(totalProcessed)}</p>
                      <p className="text-[#71717A] text-xs mt-1">Processed orders only</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#141417] border border-[#27272A]">
                      <p className="text-[#71717A] text-xs font-medium mb-1">Service Fees</p>
                      <p className="text-[#EF4444] text-xl font-bold">{formatCurrency(totalFees)}</p>
                      <p className="text-[#71717A] text-xs mt-1">CodinAfrica fees</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#141417] border border-[#27272A]">
                      <p className="text-[#71717A] text-xs font-medium mb-1">Net Profit</p>
                      <p className="text-[#10B981] text-xl font-bold">{formatCurrency(totalNet)}</p>
                      <p className="text-[#71717A] text-xs mt-1">After all fees</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#141417] border border-[#27272A]">
                      <p className="text-[#71717A] text-xs font-medium mb-1">Profit Margin</p>
                      <p className="text-[#34D399] text-xl font-bold">{formatPercentage(margin)}</p>
                      <p className="text-[#71717A] text-xs mt-1">Net / Gross</p>
                    </div>
                  </div>

                  <Card hover={false}>
                    <CardHeader>
                      <CardTitle>Profit by Country</CardTitle>
                      <span className="text-[#34D399] text-xs font-medium">{filteredCountries.length} countries</span>
                    </CardHeader>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[#27272A]">
                            <th className="text-left text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">#</th>
                            <th className="text-left text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Country</th>
                            <th className="text-right text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Processed Orders</th>
                            <th className="text-right text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Gross Revenue</th>
                            <th className="text-right text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Fee %</th>
                            <th className="text-right text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Service Fees</th>
                            <th className="text-right text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Net Revenue</th>
                            <th className="text-right text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Margin</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCountries.map((c, i) => {
                            const cMargin = c.processedRevenue > 0 ? c.netRevenue / c.processedRevenue : 0;
                            return (
                              <tr key={c.country} className="border-b border-[#27272A]/50 hover:bg-[#1A1A1A] transition-all duration-150">
                                <td className="py-3.5 px-4 text-[#71717A] text-sm">{i + 1}</td>
                                <td className="py-3.5 px-4">
                                  <span className="text-white font-medium">{c.countryName}</span>
                                </td>
                                <td className="py-3.5 px-4 text-right text-[#A1A1AA]">{formatNumber(c.processedOrders)}</td>
                                <td className="py-3.5 px-4 text-right text-white">{formatCurrency(c.processedRevenue)}</td>
                                <td className="py-3.5 px-4 text-right text-[#F59E0B] font-mono text-sm">{formatCurrency(c.feePerOrder)}</td>
                                <td className="py-3.5 px-4 text-right text-[#EF4444]">{formatCurrency(c.serviceFees)}</td>
                                <td className="py-3.5 px-4 text-right text-[#10B981] font-semibold">{formatCurrency(c.netRevenue)}</td>
                                <td className="py-3.5 px-4 text-right">
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    cMargin >= 0.9 ? "bg-[#10B981]/20 text-[#10B981]" :
                                    cMargin >= 0.8 ? "bg-[#34D399]/20 text-[#34D399]" :
                                    cMargin >= 0.7 ? "bg-[#F59E0B]/20 text-[#F59E0B]" :
                                    "bg-[#EF4444]/20 text-[#EF4444]"
                                  }`}>{formatPercentage(cMargin)}</span>
                                </td>
                              </tr>
                            );
                          })}
                          {filteredCountries.length === 0 && (
                            <tr><td colSpan={8} className="text-center py-12 text-[#71717A]">No data</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </>
              );
            })()}
          </div>
        )}

        {/* Revenue Trends */}
        {activeTab === "revenue" && (
          <Card hover={false}>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
              <span className="text-[#71717A] text-xs">Daily revenue over time</span>
            </CardHeader>
            <RevenueChart data={data?.revenueTrend ?? []} loading={false} />
          </Card>
        )}

        {/* Revenue by Country */}
        {activeTab === "countries" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#34D399]" />
              <span className="text-white text-sm font-medium">Top 10 Countries by Revenue</span>
            </div>
            <div className="space-y-2">
              {topCountries.map((c: CountryStats, i: number) => {
                const share = c.revenue / maxRevenue;
                return (
                  <div key={c.country} className="flex items-center gap-4 p-3 rounded-xl bg-[#141417] border border-[#27272A] hover:border-[#10B981]/20 transition-all duration-200">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0 ? "bg-[#F59E0B]/20 text-[#F59E0B]" :
                      i === 1 ? "bg-[#71717A]/20 text-[#71717A]" :
                      i === 2 ? "bg-[#0EA5E9]/20 text-[#0EA5E9]" :
                      "bg-[#27272A] text-[#71717A]"
                    }`}>{i + 1}</div>
                    <div className="flex items-center gap-3 min-w-0 w-48 shrink-0">
                      {c.flag && <img src={c.flag} alt={c.countryName} className="w-6 h-4 rounded shadow-sm object-cover" />}
                      <span className="text-white text-sm font-medium truncate">{c.countryName}</span>
                    </div>
                    <div className="flex-1 h-2 bg-[#27272A] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#10B981]" style={{ width: `${share * 100}%` }} />
                    </div>
                    <span className="text-white text-sm font-medium shrink-0 w-28 text-right">{formatCurrency(c.revenue)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Net Revenue by Country */}
        {activeTab === "net" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#10B981]" />
              <span className="text-white text-sm font-medium">Net Revenue by Country (after service fees)</span>
            </div>
            <Card hover={false}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#27272A]">
                      <th className="text-left text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">#</th>
                      <th className="text-left text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Country</th>
                      <th className="text-right text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Gross Revenue</th>
                      <th className="text-right text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Fee %</th>
                      <th className="text-right text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Service Fees</th>
                      <th className="text-right text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Net Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {netRevenueByCountry.map((c: CountryStats, i: number) => (
                      <tr key={c.country} className="border-b border-[#27272A]/50 hover:bg-[#1A1A1A] transition-all duration-150">
                        <td className="py-3.5 px-4 text-[#71717A] text-sm">{i + 1}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {c.flag && <img src={c.flag} alt={c.countryName} className="w-6 h-4 rounded shadow-sm object-cover" />}
                            <span className="text-white font-medium">{c.countryName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right text-[#A1A1AA]">{formatCurrency(c.processedRevenue)}</td>
                        <td className="py-3.5 px-4 text-right text-[#F59E0B] font-mono text-sm">{formatCurrency(c.feePerOrder)}</td>
                        <td className="py-3.5 px-4 text-right text-[#EF4444]">{formatCurrency(c.serviceFees)}</td>
                        <td className="py-3.5 px-4 text-right text-[#10B981] font-semibold">{formatCurrency(c.netRevenue)}</td>
                      </tr>
                    ))}
                    {netRevenueByCountry.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-12 text-[#71717A]">No data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Top Products */}
        {activeTab === "products" && (
          <Card hover={false}>
            <CardHeader>
              <CardTitle>Top 10 Products by Revenue</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#27272A]">
                    <th className="text-left text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">#</th>
                    <th className="text-left text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Product</th>
                    <th className="text-right text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Revenue</th>
                    <th className="text-right text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Sold</th>
                    <th className="text-right text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Stock</th>
                    <th className="text-right text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p: Product, i: number) => {
                    const share = p.revenue / maxProductRevenue;
                    return (
                      <tr key={p.id} className="border-b border-[#27272A]/50 hover:bg-[#1A1A1A] transition-all duration-150">
                        <td className="py-3.5 px-4">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                            i === 0 ? "bg-[#F59E0B]/20 text-[#F59E0B]" :
                            i === 1 ? "bg-[#71717A]/20 text-[#71717A]" :
                            i === 2 ? "bg-[#0EA5E9]/20 text-[#0EA5E9]" :
                            "bg-[#27272A] text-[#71717A]"
                          }`}>{i + 1}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[#27272A] flex items-center justify-center shrink-0 overflow-hidden">
                              {p.image ? (
                                <img src={p.image} alt={p.name} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" crossOrigin="anonymous" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                              ) : (
                                <Package className="w-5 h-5 text-[#71717A]" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-white text-sm font-medium truncate max-w-[200px]">{p.name}</p>
                              <p className="text-[#71717A] text-xs">{p.code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col items-end">
                            <span className="text-white text-sm font-semibold">{formatCurrency(p.revenue)}</span>
                            <div className="w-20 h-1 rounded-full bg-[#27272A] mt-1 overflow-hidden">
                              <div className="h-full rounded-full bg-[#10B981]" style={{ width: `${share * 100}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right text-[#A1A1AA]">{formatNumber(p.totalSold)}</td>
                        <td className="py-3.5 px-4 text-right">
                          <span className={`text-sm font-medium ${
                            p.stockQuantity === 0 ? "text-[#EF4444]" :
                            p.stockQuantity <= 10 ? "text-[#F59E0B]" : "text-white"
                          }`}>{formatNumber(p.stockQuantity)}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-[#A1A1AA]">{formatCurrency(p.price)}</td>
                      </tr>
                    );
                  })}
                  {topProducts.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-12 text-[#71717A]">No data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Worst Products */}
        {activeTab === "worst" && (
          <Card hover={false}>
            <CardHeader>
              <CardTitle>Worst Performing Products</CardTitle>
              <span className="text-[#EF4444] text-xs font-medium">Bottom 10 by revenue</span>
            </CardHeader>
            <div className="space-y-2">
              {worstProducts.map((p: Product, i: number) => (
                <div key={p.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[#EF4444]/5 border border-[#EF4444]/10 hover:bg-[#EF4444]/10 transition-all duration-200">
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">{p.name}</p>
                    <p className="text-[#71717A] text-xs">{p.code} &middot; {formatNumber(p.totalSold)} sold</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-[#EF4444] font-bold text-sm">{formatCurrency(p.revenue)}</span>
                    <TrendingDown className="w-4 h-4 text-[#EF4444]" />
                  </div>
                </div>
              ))}
              {worstProducts.length === 0 && (
                <p className="text-center py-8 text-[#71717A]">No data</p>
              )}
            </div>
          </Card>
        )}

        {/* Confirmation Rate */}
        {activeTab === "confirmation" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#10B981]" />
              <span className="text-white text-sm font-medium">Confirmation Rate by Country</span>
            </div>
            <div className="space-y-2">
              {confirmationByCountry.map((c: CountryStats, i: number) => (
                <div key={c.country} className="flex items-center gap-4 p-3 rounded-xl bg-[#141417] border border-[#27272A] hover:border-[#10B981]/20 transition-all duration-200">
                  <div className="flex items-center gap-3 min-w-0 w-48 shrink-0">
                    {c.flag && <img src={c.flag} alt={c.countryName} className="w-6 h-4 rounded shadow-sm object-cover" />}
                    <span className="text-white text-sm font-medium truncate">{c.countryName}</span>
                  </div>
                  <div className="flex-1 h-2 bg-[#27272A] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        c.confirmationRate >= 0.5 ? "bg-[#10B981]" :
                        c.confirmationRate >= 0.2 ? "bg-[#F59E0B]" : "bg-[#EF4444]"
                      }`}
                      style={{ width: `${c.confirmationRate * 100}%` }}
                    />
                  </div>
                  <span className={`text-sm font-medium shrink-0 w-16 text-right ${
                    c.confirmationRate >= 0.5 ? "text-[#10B981]" :
                    c.confirmationRate >= 0.2 ? "text-[#F59E0B]" : "text-[#EF4444]"
                  }`}>{formatPercentage(c.confirmationRate)}</span>
                </div>
              ))}
              {confirmationByCountry.length === 0 && (
                <p className="text-center py-8 text-[#71717A]">No data</p>
              )}
            </div>
          </div>
        )}

        {/* Processed Orders by Country */}
        {activeTab === "processed" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-[#34D399]" />
              <span className="text-white text-sm font-medium">Processed Orders by Country</span>
            </div>
            <div className="space-y-2">
              {processedByCountry.map((c: CountryStats, i: number) => {
                const share = c.processedOrders / maxProcessed;
                return (
                  <div key={c.country} className="flex items-center gap-4 p-3 rounded-xl bg-[#141417] border border-[#27272A] hover:border-[#10B981]/20 transition-all duration-200">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0 ? "bg-[#F59E0B]/20 text-[#F59E0B]" :
                      i === 1 ? "bg-[#71717A]/20 text-[#71717A]" :
                      i === 2 ? "bg-[#0EA5E9]/20 text-[#0EA5E9]" :
                      "bg-[#27272A] text-[#71717A]"
                    }`}>{i + 1}</div>
                    <div className="flex items-center gap-3 min-w-0 w-48 shrink-0">
                      {c.flag && <img src={c.flag} alt={c.countryName} className="w-6 h-4 rounded shadow-sm object-cover" />}
                      <span className="text-white text-sm font-medium truncate">{c.countryName}</span>
                    </div>
                    <div className="flex-1 h-2 bg-[#27272A] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#34D399]" style={{ width: `${share * 100}%` }} />
                    </div>
                    <span className="text-white text-sm font-medium shrink-0 w-16 text-right">{formatNumber(c.processedOrders)}</span>
                    <span className="text-[#71717A] text-xs shrink-0 w-20 text-right">{formatCurrency(c.processedRevenue)}</span>
                  </div>
                );
              })}
              {processedByCountry.length === 0 && (
                <p className="text-center py-8 text-[#71717A]">No data</p>
              )}
            </div>
          </div>
        )}

        {/* Top Customers */}
        {activeTab === "customers" && (
          <Card hover={false}>
            <CardHeader>
              <CardTitle>Top 10 Customers by Revenue</CardTitle>
              <span className="text-[#34D399] text-xs font-medium">{topCustomers.length} customers</span>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#27272A]">
                    <th className="text-left text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">#</th>
                    <th className="text-left text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Customer</th>
                    <th className="text-left text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Country</th>
                    <th className="text-center text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Orders</th>
                    <th className="text-center text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Products</th>
                    <th className="text-right text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topCustomers.map((c, i) => (
                    <tr key={c.phone} className="border-b border-[#27272A]/50 hover:bg-[#1A1A1A] transition-all duration-150">
                      <td className="py-3.5 px-4">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                          i === 0 ? "bg-[#F59E0B]/20 text-[#F59E0B]" :
                          i === 1 ? "bg-[#71717A]/20 text-[#71717A]" :
                          i === 2 ? "bg-[#0EA5E9]/20 text-[#0EA5E9]" :
                          "bg-[#27272A] text-[#71717A]"
                        }`}>{i + 1}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#10B981]/10 flex items-center justify-center">
                            <Users className="w-4 h-4 text-[#34D399]" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate max-w-[180px]">{c.name}</p>
                            <a href={`tel:${c.phone}`} className="text-[#34D399] text-xs hover:underline inline-flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {c.phone}
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-[#71717A]" />
                          <span className="text-[#A1A1AA] text-sm">{c.countryName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-white font-semibold">{c.orders}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-[#A1A1AA] text-sm">{c.products.size}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-white font-semibold">{formatCurrency(c.revenue)}</span>
                      </td>
                    </tr>
                  ))}
                  {topCustomers.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-12 text-[#71717A]">No customer data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Low Stock */}
        {activeTab === "stock" && (
          <Card hover={false}>
            <CardHeader>
              <CardTitle>Low Stock Products</CardTitle>
              <span className="text-[#F59E0B] text-xs font-medium">{lowStockData.length} items</span>
            </CardHeader>
            <div className="space-y-2">
              {lowStockData.map((p: Product) => (
                <div key={p.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[#F59E0B]/5 border border-[#F59E0B]/10 hover:bg-[#F59E0B]/10 transition-all duration-200">
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">{p.name}</p>
                    <p className="text-[#71717A] text-xs">{p.code}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-[#F59E0B] font-bold text-lg">{formatNumber(p.stockQuantity)}</span>
                    <div className="flex flex-col items-end">
                      <span className="text-[#A1A1AA] text-xs">{formatNumber(p.totalSold)} sold</span>
                      <span className="text-[#71717A] text-xs">{formatCurrency(p.revenue)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {lowStockData.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-[#10B981] text-sm font-medium">All products well stocked</p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
