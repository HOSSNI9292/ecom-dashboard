"use client";

import { useState, useMemo } from "react";
import { CheckCircle, Package, DollarSign, TrendingUp, TrendingDown, Download, Globe, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { PageWrapper } from "@/components/PageWrapper";
import { DateFilter } from "@/components/DateFilter";
import { Select } from "@/components/ui/Select";
import { useDashboardData } from "@/hooks";
import { formatNumber, formatCurrency, formatPercentage, filterOrdersByDate, COUNTRY_FLAGS } from "@/utils";
import { getImageUrlOrFallback } from "@/utils/images";
import { exportToCSV } from "@/utils/csv";
import type { DateFilterValue } from "@/utils/dates";

const DELIVERY_STATUS_COLORS: Record<string, string> = {
  processed: "#10B981",
  delivered: "#10B981",
  shipped: "#3B82F6",
  confirmed: "#0EA5E9",
  pending: "#F59E0B",
  cancelled: "#71717A",
  returned: "#EF4444",
  double: "#EC4899",
  out_of_stock: "#71717A",
  transferred: "#10B981",
};

const DELIVERY_STATUS_LABELS: Record<string, string> = {
  processed: "Delivered",
  delivered: "Delivered",
  shipped: "Shipped",
  confirmed: "Confirmed",
  pending: "Pending",
  cancelled: "Cancelled",
  returned: "Returned",
  double: "Double",
  out_of_stock: "Out of Stock",
  transferred: "To Transfer",
};

export default function DeliveredPage() {
  const { data, loading, error, refetch } = useDashboardData();
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const allOrders = data?.orders ?? [];
  const filteredOrders = useMemo(() => filterOrdersByDate(allOrders, dateFilter), [allOrders, dateFilter]);

  const deliveryOrders = useMemo(() => {
    return filteredOrders.filter((o) => {
      const status = o.status.toLowerCase();
      return [
        "pending",
        "confirmed",
        "cancelled",
        "double",
        "out_of_stock",
        "transferred",
        "processed",
        "delivered",
        "shipped",
        "returned",
      ].includes(status);
    });
  }, [filteredOrders]);

  const filteredByStatus = useMemo(() => {
    if (statusFilter === "all") return deliveryOrders;
    return deliveryOrders.filter((o) => {
      const status = o.status.toLowerCase().replace(/\s+/g, "_");
      return status === statusFilter;
    });
  }, [deliveryOrders, statusFilter]);

  const stats = useMemo(() => {
    const totalDeliveries = deliveryOrders.length;
    const deliveredOrders = deliveryOrders.filter((o) => {
      const s = o.status.toLowerCase();
      return s === "delivered" || s === "processed";
    }).length;
    const deliveredRevenue = deliveryOrders
      .filter((o) => {
        const s = o.status.toLowerCase();
        return s === "delivered" || s === "processed";
      })
      .reduce((s, o) => s + o.amount, 0);
    const returnedOrders = deliveryOrders.filter((o) => 
      o.status.toLowerCase() === "returned"
    ).length;
    
    const returnRate = totalDeliveries > 0 ? returnedOrders / totalDeliveries : 0;
    const deliveryRate = totalDeliveries > 0 ? deliveredOrders / totalDeliveries : 0;
    
    const countriesSet = new Set(deliveryOrders.map((o) => o.country));

    return {
      totalDeliveries,
      deliveredOrders,
      deliveredRevenue,
      returnRate,
      deliveryRate,
      countriesCount: countriesSet.size,
    };
  }, [deliveryOrders]);

  const statusBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    deliveryOrders.forEach((o) => {
      const status = o.status.toLowerCase().replace(/\s+/g, "_");
      breakdown[status] = (breakdown[status] || 0) + 1;
    });
    return breakdown;
  }, [deliveryOrders]);

  const handleExport = () => {
    exportToCSV(
      filteredByStatus.map((o) => ({
        trackingNumber: o.orderId,
        product: o.productName,
        country: o.countryName || o.country,
        deliveryDate: new Date(o.date).toLocaleDateString(),
        quantity: o.quantity,
        status: o.status,
        revenue: o.amount,
      })),
      "deliveries",
      {
        trackingNumber: "Tracking Number",
        product: "Product",
        country: "Country",
        deliveryDate: "Delivery Date",
        quantity: "Quantity",
        status: "Status",
        revenue: "Revenue (XOF)",
      }
    );
  };

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status.toLowerCase().replace(/\s+/g, "_");
    const color = DELIVERY_STATUS_COLORS[normalizedStatus] || "#71717A";
    const label = DELIVERY_STATUS_LABELS[normalizedStatus] || status;
    
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
        style={{
          backgroundColor: `${color}20`,
          color: color,
          border: `1px solid ${color}40`,
        }}
      >
        {label}
      </span>
    );
  };

  return (
    <PageWrapper loading={loading && !data} error={error} onRetry={refetch} hasData={!!data}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#10B981]/10">
              <CheckCircle className="w-6 h-6 text-[#10B981]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#FAFAFA]">Deliveries</h1>
              <p className="text-[#71717A] text-xs">Track delivery status and performance</p>
            </div>
          </div>
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

        <div className="flex gap-3 flex-wrap">
          <DateFilter value={dateFilter} onChange={setDateFilter} />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "All Statuses" },
              { value: "pending", label: "Pending" },
              { value: "confirmed", label: "Confirmed" },
              { value: "cancelled", label: "Cancelled" },
              { value: "delivered", label: "Delivered" },
              { value: "processed", label: "Delivered" },
              { value: "shipped", label: "Shipped" },
              { value: "returned", label: "Returned" },
              { value: "double", label: "Double" },
              { value: "out_of_stock", label: "Out of Stock" },
              { value: "transferred", label: "To Transfer" },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Total Deliveries"
            value={formatNumber(stats.totalDeliveries)}
            icon={<Package className="w-5 h-5" />}
            color="primary"
            delay={0}
            subtitle={`${stats.countriesCount} countries`}
            glass
          />
          <StatCard
            title="Delivered Orders"
            value={formatNumber(stats.deliveredOrders)}
            icon={<CheckCircle className="w-5 h-5" />}
            color="success"
            delay={50}
            subtitle={formatCurrency(stats.deliveredRevenue)}
            glass
          />
          <StatCard
            title="Delivered Revenue"
            value={formatCurrency(stats.deliveredRevenue)}
            icon={<DollarSign className="w-5 h-5" />}
            color="success"
            delay={100}
            subtitle={`${stats.deliveredOrders} orders`}
            glass
          />
          <StatCard
            title="Return Rate"
            value={formatPercentage(stats.returnRate)}
            icon={<TrendingDown className="w-5 h-5" />}
            color="error"
            delay={150}
            subtitle="Returned orders"
          />
          <StatCard
            title="Delivery Rate"
            value={formatPercentage(stats.deliveryRate)}
            icon={<TrendingUp className="w-5 h-5" />}
            color="success"
            delay={200}
            subtitle="Successfully delivered"
          />
          <StatCard
            title="Countries"
            value={formatNumber(stats.countriesCount)}
            icon={<Globe className="w-5 h-5" />}
            color="info"
            delay={250}
            subtitle="With deliveries"
          />
        </div>

        <Card glass>
          <CardHeader>
            <CardTitle>Deliveries</CardTitle>
            <span className="text-[#10B981] text-xs font-medium">{filteredByStatus.length} deliveries</span>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#27272A]">
                  <th className="text-left text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Tracking</th>
                  <th className="text-left text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Product</th>
                  <th className="text-left text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Country</th>
                  <th className="text-left text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Date</th>
                  <th className="text-center text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Qty</th>
                  <th className="text-center text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Status</th>
                  <th className="text-right text-[#71717A] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {filteredByStatus.map((o) => (
                  <tr key={o.id} className="border-b border-[#27272A]/50 transition-all duration-150 hover:bg-[#1C1C21] group">
                    <td className="py-3.5 px-4">
                      <span className="text-[#FAFAFA] font-mono text-xs">{o.orderId.substring(0, 12)}...</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {o.productImage ? (
                          <img 
                            src={getImageUrlOrFallback(o.productImage)} 
                            alt={o.productName} 
                            className="w-10 h-10 rounded-xl object-cover bg-[#27272A] border border-[#27272A]"
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                            onError={(e) => {
                              e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'/%3E%3Ccircle cx='9' cy='9' r='2'/%3E%3Cpath d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/%3E%3C/svg%3E";
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-[#27272A] flex items-center justify-center">
                            <Package className="w-5 h-5 text-[#3F3F46]" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-[#FAFAFA] text-sm font-medium truncate max-w-[200px]">{o.productName}</p>
                          <p className="text-[#71717A] text-xs">{o.productCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        {COUNTRY_FLAGS[o.country] && (
                          <img src={COUNTRY_FLAGS[o.country]} alt={o.countryName} className="w-5 h-3.5 rounded shadow-sm object-cover ring-1 ring-[#27272A]" />
                        )}
                        <span className="text-[#FAFAFA] text-sm">{o.countryName || o.country}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[#A1A1AA] text-sm">{new Date(o.date).toLocaleDateString()}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-[#FAFAFA] font-semibold">{o.quantity}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(o.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-[#FAFAFA] font-semibold">{formatCurrency(o.amount)}</span>
                    </td>
                  </tr>
                ))}
                {filteredByStatus.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-[#71717A]">
                      No deliveries found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
}
