"use client";

import { useMemo, useCallback, useState } from "react";
import { Globe, DollarSign, ShoppingCart, CheckCircle, TrendingUp, Download, Star, Percent, TrendingDown } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { CountryBarChart } from "@/components/charts/CountryBarChart";
import { PageWrapper } from "@/components/PageWrapper";
import { DateFilter } from "@/components/DateFilter";
import { useCountries, useDashboardData } from "@/hooks";
import { formatCurrency, formatNumber, formatPercentage, filterOrdersByDate, getFeeForCountry, computeServiceFees, COUNTRY_NAMES, COUNTRY_FLAGS } from "@/utils";
import { exportToCSV } from "@/utils/csv";
import type { CountryStats, Order } from "@/types";
import type { DateFilterValue } from "@/utils/dates";

export default function CountriesPage() {
  const { data, loading, error, refetch } = useCountries();
  const ordersData = useDashboardData();
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("all");

  const allOrders = ordersData.data?.orders ?? [];
  const filteredOrders = useMemo(() => filterOrdersByDate(allOrders, dateFilter), [allOrders, dateFilter]);

  const filteredCountriesData = useMemo(() => {
    if (dateFilter === "all") return data;

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
        flag: COUNTRY_FLAGS[code] || "",
        currency: "XOF",
        grossRevenue: d.processedRevenue,
        feePerOrder,
        serviceFees,
        netRevenue: d.processedRevenue - serviceFees,
        confirmationRate: nonCancelled > 0 ? d.confirmed / nonCancelled : 0,
        deliveryRate: d.orders > 0 ? d.processedOrders / d.orders : 0,
      } as CountryStats;
    }).sort((a, b) => b.revenue - a.revenue);
  }, [data, filteredOrders, dateFilter]);

  const bestCountry = useMemo(() => {
    if (!filteredCountriesData || filteredCountriesData.length === 0) return null;
    return [...filteredCountriesData].sort((a, b) => b.netRevenue - a.netRevenue)[0];
  }, [filteredCountriesData]);

  const totalRevenue = filteredCountriesData?.reduce((s, c) => s + c.revenue, 0) ?? 0;
  const totalOrders = filteredCountriesData?.reduce((s, c) => s + c.orders, 0) ?? 0;
  const avgConfirmation = filteredCountriesData && filteredCountriesData.length > 0
    ? filteredCountriesData.reduce((s, c) => s + c.confirmationRate, 0) / filteredCountriesData.length
    : 0;
  const avgDelivery = filteredCountriesData && filteredCountriesData.length > 0
    ? filteredCountriesData.reduce((s, c) => s + c.deliveryRate, 0) / filteredCountriesData.length
    : 0;
  const totalNetRevenue = filteredCountriesData?.reduce((s, c) => s + c.netRevenue, 0) ?? 0;
  const totalFees = filteredCountriesData?.reduce((s, c) => s + c.serviceFees, 0) ?? 0;

  const sorted = useMemo(() => (filteredCountriesData ?? []).sort((a, b) => b.revenue - a.revenue), [filteredCountriesData]);

  const handleExport = useCallback(() => {
    exportToCSV(
      sorted.map((c) => ({
        country: c.countryName,
        revenue: c.revenue,
        processedRevenue: c.processedRevenue,
        netRevenue: c.netRevenue,
        feePerOrder: c.feePerOrder,
        serviceFees: c.serviceFees,
        orders: c.orders,
        confirmed: c.confirmed,
        processedOrders: c.processedOrders,
        pending: c.pending,
        cancelled: c.cancelled,
        confirmationRate: `${(c.confirmationRate * 100).toFixed(1)}%`,
        deliveryRate: `${(c.deliveryRate * 100).toFixed(1)}%`,
      })),
      "countries_export",
      {
        country: "Country",
        revenue: "Revenue (XOF)",
        processedRevenue: "Processed Revenue (XOF)",
        netRevenue: "Net Revenue (XOF)",
        feePerOrder: "Fee/Order (XOF)",
        serviceFees: "Service Fees (XOF)",
        orders: "Orders",
        confirmed: "Confirmed",
        processedOrders: "Processed Orders",
        pending: "Pending",
        cancelled: "Cancelled",
        confirmationRate: "Confirmation Rate",
        deliveryRate: "Delivery Rate",
      }
    );
  }, [sorted]);

  const maxRevenue = useMemo(() => Math.max(...sorted.map((c) => c.revenue), 1), [sorted]);

  return (
    <PageWrapper loading={loading && !filteredCountriesData?.length} error={error} onRetry={refetch} hasData={!!filteredCountriesData?.length}>
      <div className="space-y-6">
        <DateFilter value={dateFilter} onChange={setDateFilter} />
        
        {bestCountry && (
          <Card className="bg-gradient-to-br from-[#10B981]/10 via-[#141417] to-[#141417] border-[#10B981]/20 glow-primary" hover={false}>
            <div className="flex items-center gap-5">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#10B981]/10 to-[#0EA5E9]/10 shrink-0">
                <Star className="w-8 h-8 text-[#34D399]" />
              </div>
              <div>
                <p className="text-[#71717A] text-xs font-medium uppercase tracking-wider">Best Performing Country</p>
                <p className="text-3xl font-bold text-[#FAFAFA] mt-1">{bestCountry.countryName}</p>
                <div className="flex items-center gap-5 mt-2">
                  <div>
                    <p className="text-[#10B981] text-lg font-bold">{formatCurrency(bestCountry.netRevenue)}</p>
                    <p className="text-[#71717A] text-[11px]">Net Revenue</p>
                  </div>
                  <div className="w-px h-10 bg-[#27272A]" />
                  <div>
                    <p className="text-[#FAFAFA] text-lg font-bold">{formatNumber(bestCountry.processedOrders)}</p>
                    <p className="text-[#71717A] text-[11px]">Processed Orders</p>
                  </div>
                  <div className="w-px h-10 bg-[#27272A]" />
                  <div>
                    <p className="text-[#34D399] text-lg font-bold">{formatPercentage(bestCountry.deliveryRate)}</p>
                    <p className="text-[#71717A] text-[11px]">Delivery Rate</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={<DollarSign className="w-5 h-5" />} color="primary" delay={0} glass />
          <StatCard title="Net Revenue" value={formatCurrency(totalNetRevenue)} icon={<DollarSign className="w-5 h-5" />} color="success" delay={50} subtitle="After fees" glass />
          <StatCard title="Service Fees" value={formatCurrency(totalFees)} icon={<Percent className="w-5 h-5" />} color="warning" delay={100} glass />
          <StatCard title="Total Orders" value={formatNumber(totalOrders)} icon={<ShoppingCart className="w-5 h-5" />} color="info" delay={150} glass />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CountryBarChart data={filteredCountriesData ?? []} loading={loading} dataKey="revenue" title="Revenue by Country" />
          <CountryBarChart data={filteredCountriesData ?? []} loading={loading} dataKey="orders" title="Orders by Country" />
        </div>

        <Card glass>
          <CardHeader>
            <CardTitle>Country Rankings</CardTitle>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#27272A] border border-[#27272A] transition-all duration-200"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                  <tr className="border-b border-[#27272A]">
                    <th className="text-left text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">#</th>
                    <th className="text-left text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Country</th>
                    <th className="text-right text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Revenue</th>
                    <th className="text-right text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Net Revenue</th>
                    <th className="text-right text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Fee/Order</th>
                    <th className="text-right text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Processed</th>
                    <th className="text-right text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Conf. Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((country: CountryStats, idx: number) => {
                    const revenueShare = country.revenue / maxRevenue;
                    return (
                      <tr key={country.country} className="border-b border-[#27272A]/50 transition-all duration-150 hover:bg-[#1C1C21] group">
                        <td className="py-3.5 px-4">
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${
                            idx === 0 ? "bg-gradient-to-br from-[#F59E0B]/20 to-[#F59E0B]/5 text-[#F59E0B]" :
                            idx === 1 ? "bg-gradient-to-br from-[#71717A]/20 to-[#71717A]/5 text-[#A1A1AA]" :
                            idx === 2 ? "bg-gradient-to-br from-[#0EA5E9]/20 to-[#0EA5E9]/5 text-[#0EA5E9]" :
                            "bg-[#27272A] text-[#71717A]"
                          }`}>
                            {idx + 1}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {country.flag ? (
                              <img src={country.flag} alt={country.countryName} className="w-7 h-5 rounded shadow-sm object-cover ring-1 ring-[#27272A]" />
                            ) : (
                              <div className="w-7 h-5 rounded bg-[#27272A] flex items-center justify-center">
                                <Globe className="w-3.5 h-3.5 text-[#71717A]" />
                              </div>
                            )}
                            <span className="text-[#FAFAFA] font-medium">{country.countryName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col items-end">
                            <span className="text-[#FAFAFA] font-semibold text-sm">{formatCurrency(country.revenue)}</span>
                            <div className="w-24 h-1 rounded-full bg-[#27272A] mt-1 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#10B981] to-[#0EA5E9]"
                                style={{ width: `${revenueShare * 100}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right text-[#10B981] font-semibold">{formatCurrency(country.netRevenue)}</td>
                        <td className="py-3.5 px-4 text-right text-[#F59E0B] font-mono text-sm">{formatCurrency(country.feePerOrder)}</td>
                        <td className="py-3.5 px-4 text-right text-[#FAFAFA] font-medium">{formatNumber(country.processedOrders)}</td>
                        <td className="py-3.5 px-4 text-right">
                          <span className={`text-sm font-medium ${
                            country.confirmationRate >= 0.5 ? "text-[#10B981]" :
                            country.confirmationRate >= 0.2 ? "text-[#F59E0B]" : "text-[#EF4444]"
                          }`}>
                            {formatPercentage(country.confirmationRate)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {sorted.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-12 text-[#71717A]">No country data</td></tr>
                  )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
}
