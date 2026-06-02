"use client";

import { useState, useMemo } from "react";
import { CheckCircle, Package, DollarSign, TrendingUp, TrendingDown, Download, Globe } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { PageWrapper } from "@/components/PageWrapper";
import { DateFilter } from "@/components/DateFilter";
import { Select } from "@/components/ui/Select";
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
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("all");
  const [statusFilter, setStatusFilter] = useState("shipping");

  const allOrders = data?.orders ?? [];
  const filteredOrders = useMemo(() => filterOrdersByDate(allOrders, dateFilter), [allOrders, dateFilter]);

  const deliveredOrders = useMemo(() => {
    return filteredOrders.filter((o) => o.status === statusFilter);
  }, [filteredOrders, statusFilter]);

  const yesterdayOrders = useMemo(() => {
    const yesterday = filterOrdersByDate(allOrders, "yesterday");
    return yesterday.filter((o) => o.status === statusFilter);
  }, [allOrders, statusFilter]);

  const statusBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    filteredOrders.forEach((o) => {
      breakdown[o.status] = (breakdown[o.status] || 0) + 1;
    });
    return breakdown;
  }, [filteredOrders]);

  const rawStatusBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    filteredOrders.forEach((o) => {
      breakdown[o.rawStatus] = (breakdown[o.rawStatus] || 0) + 1;
    });
    return breakdown;
  }, [filteredOrders]);

  const sampleOrder = useMemo(() => {
    return filteredOrders.length > 0 ? filteredOrders[0] : null;
  }, [filteredOrders]);

  const confirmedOrders = useMemo(() => {
    return filteredOrders.filter((o) => o.status === "confirmed");
  }, [filteredOrders]);

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

      if (o.status === statusFilter) {
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
  }, [filteredOrders, statusFilter]);

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
              <h1 className="text-xl font-bold text-white">{statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Orders</h1>
              <p className="text-[#606060] text-xs">Track {statusFilter} orders by country</p>
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

        <div className="flex gap-3">
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "shipping", label: "Shipping" },
              { value: "delivered", label: "Delivered" },
              { value: "confirmed", label: "Confirmed" },
              { value: "pending", label: "Pending" },
              { value: "cancelled", label: "Cancelled" },
              { value: "double", label: "Double" },
              { value: "transferred", label: "Transferred" },
              { value: "out_of_stock", label: "Out of Stock" },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={`${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Orders`}
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
            title={`Yesterday ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`}
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
            <CardTitle>🔍 Debug: Order Status Analysis</CardTitle>
            <span className="text-[#f59e0b] text-xs">Check what statuses exist in your data</span>
          </CardHeader>
          <div className="space-y-6">
            <div>
              <h3 className="text-white text-sm font-semibold mb-3">📊 Mapped Statuses (after conversion)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(statusBreakdown).length === 0 ? (
                  <p className="text-[#606060] text-sm">No orders found</p>
                ) : (
                  Object.entries(statusBreakdown).map(([status, count]) => (
                    <div key={status} className="bg-[#0A0A0A] rounded-lg p-3 border border-[#1F1F1F]">
                      <p className="text-[#606060] text-xs uppercase">{status}</p>
                      <p className={`text-lg font-bold ${status === statusFilter ? "text-[#10b981]" : "text-white"}`}>
                        {count}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="text-white text-sm font-semibold mb-3">🔥 Raw API Statuses (original from API)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(rawStatusBreakdown).length === 0 ? (
                  <p className="text-[#606060] text-sm">No orders found</p>
                ) : (
                  Object.entries(rawStatusBreakdown).map(([status, count]) => (
                    <div key={status} className="bg-[#0A0A0A] rounded-lg p-3 border border-[#f59e0b]/20">
                      <p className="text-[#f59e0b] text-xs font-mono">{status}</p>
                      <p className="text-white text-lg font-bold">{count}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {sampleOrder && (
              <div>
                <h3 className="text-white text-sm font-semibold mb-3">📋 Sample Order</h3>
                <div className="bg-[#0A0A0A] rounded-lg p-4 border border-[#1F1F1F]">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[#606060] text-xs">Order ID</p>
                      <p className="text-white font-mono">{sampleOrder.orderId}</p>
                    </div>
                    <div>
                      <p className="text-[#606060] text-xs">Mapped Status</p>
                      <p className="text-[#10b981] font-semibold">{sampleOrder.status}</p>
                    </div>
                    <div>
                      <p className="text-[#606060] text-xs">Raw Status (from API)</p>
                      <p className="text-[#f59e0b] font-semibold">{sampleOrder.rawStatus}</p>
                    </div>
                    <div>
                      <p className="text-[#606060] text-xs">Country</p>
                      <p className="text-white">{sampleOrder.countryName}</p>
                    </div>
                    <div>
                      <p className="text-[#606060] text-xs">Amount</p>
                      <p className="text-white">{formatCurrency(sampleOrder.amount)}</p>
                    </div>
                    <div>
                      <p className="text-[#606060] text-xs">Date</p>
                      <p className="text-white">{new Date(sampleOrder.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-[#1F1F1F] rounded-lg p-4 border border-[#2a2a2a]">
              <h3 className="text-white text-sm font-semibold mb-2">💡 How to fix:</h3>
              <ul className="text-[#c0c0c0] text-sm space-y-1 list-disc list-inside">
                <li>If you see "Shipping" in Raw API Statuses, it should map to "shipping" in Mapped Statuses</li>
                <li>If "shipping" shows 0 in Mapped Statuses, check the Raw API Statuses to see the exact name</li>
                <li>The STATUS_MAP in <code className="text-[#22D3EE]">constants.ts</code> converts API names to lowercase</li>
                <li>Common mappings: "Shipping" → "shipping", "Delivered" → "delivered", "Confirmed" → "confirmed"</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card hover={false}>
          <CardHeader>
            <CardTitle>{statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} by Country</CardTitle>
            <span className="text-[#10b981] text-xs font-medium">{countriesData.length} countries</span>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1F1F1F]">
                  <th className="text-left text-[#606060] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Country</th>
                  <th className="text-center text-[#606060] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">{statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}</th>
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
                      No {statusFilter} orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card hover={false}>
          <CardHeader>
            <CardTitle>🔍 Debug: Order Status Analysis</CardTitle>
            <span className="text-[#f59e0b] text-xs">Check what statuses exist in your data</span>
          </CardHeader>
          <div className="space-y-6">
            <div>
              <h3 className="text-white text-sm font-semibold mb-3">📊 Mapped Statuses (after conversion)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(statusBreakdown).length === 0 ? (
                  <p className="text-[#606060] text-sm">No orders found</p>
                ) : (
                  Object.entries(statusBreakdown).map(([status, count]) => (
                    <div key={status} className="bg-[#0A0A0A] rounded-lg p-3 border border-[#1F1F1F]">
                      <p className="text-[#606060] text-xs uppercase">{status}</p>
                      <p className={`text-lg font-bold ${status === statusFilter ? "text-[#10b981]" : "text-white"}`}>
                        {count}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="text-white text-sm font-semibold mb-3">🔥 Raw API Statuses (original from API)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(rawStatusBreakdown).length === 0 ? (
                  <p className="text-[#606060] text-sm">No orders found</p>
                ) : (
                  Object.entries(rawStatusBreakdown).map(([status, count]) => (
                    <div key={status} className="bg-[#0A0A0A] rounded-lg p-3 border border-[#f59e0b]/20">
                      <p className="text-[#f59e0b] text-xs font-mono">{status}</p>
                      <p className="text-white text-lg font-bold">{count}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {sampleOrder && (
              <div>
                <h3 className="text-white text-sm font-semibold mb-3">📋 Sample Order</h3>
                <div className="bg-[#0A0A0A] rounded-lg p-4 border border-[#1F1F1F]">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[#606060] text-xs">Order ID</p>
                      <p className="text-white font-mono">{sampleOrder.orderId}</p>
                    </div>
                    <div>
                      <p className="text-[#606060] text-xs">Mapped Status</p>
                      <p className="text-[#10b981] font-semibold">{sampleOrder.status}</p>
                    </div>
                    <div>
                      <p className="text-[#606060] text-xs">Raw Status (from API)</p>
                      <p className="text-[#f59e0b] font-semibold">{sampleOrder.rawStatus}</p>
                    </div>
                    <div>
                      <p className="text-[#606060] text-xs">Country</p>
                      <p className="text-white">{sampleOrder.countryName}</p>
                    </div>
                    <div>
                      <p className="text-[#606060] text-xs">Amount</p>
                      <p className="text-white">{formatCurrency(sampleOrder.amount)}</p>
                    </div>
                    <div>
                      <p className="text-[#606060] text-xs">Date</p>
                      <p className="text-white">{new Date(sampleOrder.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-[#1F1F1F] rounded-lg p-4 border border-[#2a2a2a]">
              <h3 className="text-white text-sm font-semibold mb-2">💡 How to fix:</h3>
              <ul className="text-[#c0c0c0] text-sm space-y-1 list-disc list-inside">
                <li>If you see "Shipping" in Raw API Statuses, it should map to "shipping" in Mapped Statuses</li>
                <li>If "shipping" shows 0 in Mapped Statuses, check the Raw API Statuses to see the exact name</li>
                <li>The STATUS_MAP in <code className="text-[#22D3EE]">constants.ts</code> converts API names to lowercase</li>
                <li>Common mappings: "Shipping" → "shipping", "Delivered" → "delivered", "Confirmed" → "confirmed"</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
}
