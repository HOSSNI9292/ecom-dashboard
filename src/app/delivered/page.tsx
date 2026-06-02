"use client";

import { useState, useMemo } from "react";
import { CheckCircle, Package, DollarSign, TrendingUp, TrendingDown, Download, Globe } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { PageWrapper } from "@/components/PageWrapper";
import { DateFilter } from "@/components/DateFilter";
import { useDashboardData } from "@/hooks";
import { formatNumber, formatCurrency, formatPercentage, filterOrdersByDate, COUNTRY_NAMES, COUNTRY_FLAGS } from "@/utils";
import { exportToCSV } from "@/utils/csv";
import type { Order } from "@/types";
import type { DateFilterValue } from "@/utils/dates";

interface CountryDelivered {
  country: string;
  countryName: string;
  flag: string;
  delivered: number;
  revenue: number;
  totalOrders: number;
  deliveryRate: number;
}

export default function DeliveredPage() {
  const { data, loading, error, refetch } = useDashboardData();
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("today");

  const allOrders = data?.orders ?? [];
  const filteredOrders = useMemo(() => filterOrdersByDate(allOrders, dateFilter), [allOrders, dateFilter]);

  const deliveredOrders = useMemo(() => {
    return filteredOrders.filter((o) => o.status === "delivered");
  }, [filteredOrders]);

  const yesterdayOrders = useMemo(() => {
    const yesterday = filterOrdersByDate(allOrders, "yesterday");
    return yesterday.filter((o) => o.status === "delivered");
  }, [allOrders]);

  const stats = useMemo(() => {
    const totalDelivered = deliveredOrders.length;
    const totalRevenue = deliveredOrders.reduce((s, o) => s + o.amount, 0);
    const yesterdayDelivered = yesterdayOrders.length;
    const yesterdayRevenue = yesterdayOrders.reduce((s, o) => s + o.amount, 0);

    const changeDelivered = yesterdayDelivered > 0 ? ((totalDelivered - yesterdayDelivered) / yesterdayDelivered) : 0;
    const changeRevenue = yesterdayRevenue > 0 ? ((totalRevenue - yesterdayRevenue) / yesterdayRevenue) : 0;

    return {
      totalDelivered,
      totalRevenue,
      yesterdayDelivered,
      yesterdayRevenue,
      changeDelivered,
      changeRevenue,
    };
  }, [deliveredOrders, yesterdayOrders]);

  const countriesData = useMemo((): CountryDelivered[] => {
    const map = new Map<string, CountryDelivered>();

    for (const o of filteredOrders) {
      const country = o.country || "XX";
      if (!map.has(country)) {
        map.set(country, {
          country,
          countryName: o.countryName || COUNTRY_NAMES[country] || country,
          flag: COUNTRY_FLAGS[country] || "",
          delivered: 0,
          revenue: 0,
          totalOrders: 0,
          deliveryRate: 0,
        });
      }

      const c = map.get(country)!;
      c.totalOrders += 1;

      if (o.status === "delivered") {
        c.delivered += 1;
        c.revenue += o.amount;
      }
    }

    return Array.from(map.values())
      .map((c) => ({
        ...c,
        deliveryRate: c.totalOrders > 0 ? c.delivered / c.totalOrders : 0,
      }))
      .filter((c) => c.delivered > 0)
      .sort((a, b) => b.delivered - a.delivered);
  }, [filteredOrders]);

  const handleExport = () => {
    exportToCSV(
      countriesData.map((c) => ({
        country: c.countryName,
        delivered: c.delivered,
        revenue: c.revenue,
        totalOrders: c.totalOrders,
        deliveryRate: `${(c.deliveryRate * 100).toFixed(1)}%`,
      })),
      "delivered_orders",
      {
        country: "Country",
        delivered: "Delivered Orders",
        revenue: "Revenue (XOF)",
        totalOrders: "Total Orders",
        deliveryRate: "Delivery Rate",
      }
    );
  };

  return (
    <PageWrapper loading={loading && !data} error={error} onRetry={refetch} hasData={!!data}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#10b981]/10">
              <CheckCircle className="w-6 h-6 text-[#10b981]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Delivered Orders</h1>
              <p className="text-[#606060] text-xs">Track successful deliveries by country</p>
            </div>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#606060] hover:text-white hover:bg-[#111111] border border-[#1F1F1F] transition-all duration-200"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>

        <DateFilter value={dateFilter} onChange={setDateFilter} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Delivered Orders"
            value={formatNumber(stats.totalDelivered)}
            icon={<CheckCircle className="w-5 h-5" />}
            color="success"
            delay={0}
            subtitle={
              stats.changeDelivered !== 0
                ? `${stats.changeDelivered > 0 ? "+" : ""}${(stats.changeDelivered * 100).toFixed(1)}% vs yesterday`
                : "vs yesterday"
            }
          />
          <StatCard
            title="Revenue"
            value={formatCurrency(stats.totalRevenue)}
            icon={<DollarSign className="w-5 h-5" />}
            color="success"
            delay={50}
            subtitle={
              stats.changeRevenue !== 0
                ? `${stats.changeRevenue > 0 ? "+" : ""}${(stats.changeRevenue * 100).toFixed(1)}% vs yesterday`
                : "vs yesterday"
            }
          />
          <StatCard
            title="Yesterday Delivered"
            value={formatNumber(stats.yesterdayDelivered)}
            icon={<Package className="w-5 h-5" />}
            color="info"
            delay={100}
            subtitle={formatCurrency(stats.yesterdayRevenue)}
          />
          <StatCard
            title="Countries"
            value={formatNumber(countriesData.length)}
            icon={<Globe className="w-5 h-5" />}
            color="primary"
            delay={150}
            subtitle="Active deliveries"
          />
        </div>

        <Card hover={false}>
          <CardHeader>
            <CardTitle>Delivered by Country</CardTitle>
            <span className="text-[#10b981] text-xs font-medium">{countriesData.length} countries</span>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1F1F1F]">
                  <th className="text-left text-[#606060] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Country</th>
                  <th className="text-center text-[#606060] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Delivered</th>
                  <th className="text-center text-[#606060] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Revenue</th>
                  <th className="text-center text-[#606060] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Total Orders</th>
                  <th className="text-center text-[#606060] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Delivery Rate</th>
                </tr>
              </thead>
              <tbody>
                {countriesData.map((c) => (
                  <tr key={c.country} className="border-b border-[#1F1F1F]/50 transition-all duration-150 hover:bg-[#1A1A1A] group">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {c.flag && (
                          <img src={c.flag} alt={c.countryName} className="w-6 h-4 rounded shadow-sm object-cover" />
                        )}
                        <span className="text-white font-medium">{c.countryName}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-[#10b981] text-lg font-bold">{formatNumber(c.delivered)}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-white font-semibold">
                      {formatCurrency(c.revenue)}
                    </td>
                    <td className="py-3.5 px-4 text-center text-[#c0c0c0]">
                      {formatNumber(c.totalOrders)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-[#1F1F1F] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#10b981]"
                            style={{ width: `${c.deliveryRate * 100}%` }}
                          />
                        </div>
                        <span className="text-[#10b981] text-sm font-semibold">
                          {formatPercentage(c.deliveryRate)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                {countriesData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-[#606060]">
                      No delivered orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card hover={false}>
          <CardHeader>
            <CardTitle>Recent Deliveries</CardTitle>
            <span className="text-[#606060] text-xs">Latest {Math.min(deliveredOrders.length, 10)}</span>
          </CardHeader>
          <div className="space-y-2">
            {deliveredOrders.slice(0, 10).map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-[#1F1F1F]/50 hover:border-[#10b981]/20 hover:bg-[#1A1A1A] transition-all duration-200"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-[#10b981]/10">
                    <CheckCircle className="w-4 h-4 text-[#10b981]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{o.customerName}</p>
                    <p className="text-[#606060] text-xs">
                      {o.productName} • {o.countryName || o.country}
                    </p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3 shrink-0 ml-3">
                  <span className="text-[#10b981] text-sm font-semibold">{formatCurrency(o.amount)}</span>
                </div>
              </div>
            ))}
            {deliveredOrders.length === 0 && (
              <p className="text-[#606060] text-sm text-center py-8">No delivered orders</p>
            )}
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
}
