"use client";

import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, Package, DollarSign, TrendingUp, TrendingDown, Download, Globe, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { PageWrapper } from "@/components/PageWrapper";
import { DateFilter } from "@/components/DateFilter";
import { Select } from "@/components/ui/Select";
import { useDashboardData } from "@/hooks";
import { formatNumber, formatCurrency, formatPercentage, filterOrdersByDate, COUNTRY_FLAGS } from "@/utils";
import { exportToCSV } from "@/utils/csv";
import type { DateFilterValue } from "@/utils/dates";
import type { CodinAfricaShipping } from "@/types";

const SHIPPING_STATUS_COLORS: Record<string, string> = {
  "to prepare": "#F59E0B",
  prepared: "#6366F1",
  shipped: "#8B5CF6",
  delivered: "#10B981",
  processed: "#10B981",
  reprogrammer: "#F97316",
  return: "#EF4444",
  rembourser: "#64748B",
};

const SHIPPING_STATUS_LABELS: Record<string, string> = {
  "to prepare": "To Prepare",
  prepared: "Prepared",
  shipped: "Shipped",
  delivered: "Delivered",
  processed: "Paid",
  reprogrammer: "Reprogrammer",
  return: "Returned",
  rembourser: "Rembourser",
};

export default function DeliveredPage() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useDashboardData();
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const allShippings: CodinAfricaShipping[] = data?.shippings ?? [];
  const filteredShippings = useMemo(() => {
    const mapped = allShippings.map((s) => ({
      ...s,
      date: s.createdAt || s.date || s.updatedAt || "",
    }));
    return filterOrdersByDate(mapped, dateFilter);
  }, [allShippings, dateFilter]);

  const filteredByStatus = useMemo(() => {
    if (statusFilter === "all") return filteredShippings;
    return filteredShippings.filter((s) => s.status === statusFilter);
  }, [filteredShippings, statusFilter]);

  const stats = useMemo(() => {
    const totalDeliveries = filteredShippings.length;
    const deliveredOrders = filteredShippings.filter((s) => s.status === "delivered").length;
    const deliveredRevenue = filteredShippings
      .filter((s) => s.status === "delivered")
      .reduce((sum, s) => sum + (s.totalPrice || 0), 0);
    const paidOrders = filteredShippings.filter((s) => s.status === "processed").length;
    const paidRevenue = filteredShippings
      .filter((s) => s.status === "processed")
      .reduce((sum, s) => sum + (s.totalPrice || 0), 0);
    const shippedOrders = filteredShippings.filter((s) => s.status === "shipped").length;
    const returnedOrders = filteredShippings.filter((s) => s.status === "return").length;
    const toPrepareOrders = filteredShippings.filter((s) => s.status === "to prepare").length;
    const preparedOrders = filteredShippings.filter((s) => s.status === "prepared").length;
    const reprogrammerOrders = filteredShippings.filter((s) => s.status === "reprogrammer").length;
    
    const totalDeliveryAttempts = paidOrders + returnedOrders;
    const deliveryRate = totalDeliveryAttempts > 0 ? paidOrders / totalDeliveryAttempts : 0;
    const returnRate = totalDeliveryAttempts > 0 ? returnedOrders / totalDeliveryAttempts : 0;
    
    const countriesSet = new Set(filteredShippings.map((s) => s.customer?.country).filter(Boolean));

    return {
      totalDeliveries,
      deliveredOrders,
      deliveredRevenue,
      paidOrders,
      paidRevenue,
      shippedOrders,
      returnedOrders,
      toPrepareOrders,
      preparedOrders,
      reprogrammerOrders,
      returnRate,
      deliveryRate,
      countriesCount: countriesSet.size,
    };
  }, [filteredShippings]);

  const statusBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    filteredShippings.forEach((s) => {
      const st = s.status || "unknown";
      breakdown[st] = (breakdown[st] || 0) + 1;
    });
    return breakdown;
  }, [filteredShippings]);

  const handleExport = () => {
    exportToCSV(
      filteredByStatus.map((s) => ({
        trackingNumber: s.id || s._id,
        customer: s.customer?.fullName || "Unknown",
        country: s.customer?.country || "",
        date: new Date(s.date || s.createdAt || s.updatedAt).toLocaleDateString(),
        status: s.status,
        revenue: s.totalPrice || 0,
      })),
      "deliveries",
      {
        trackingNumber: "Tracking Number",
        customer: "Customer",
        country: "Country",
        date: "Date",
        status: "Status",
        revenue: "Revenue (XOF)",
      }
    );
  };

  const getStatusBadge = (status: string) => {
    const color = SHIPPING_STATUS_COLORS[status] || "#64748B";
    const label = SHIPPING_STATUS_LABELS[status] || status;
    
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
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
            <div className="p-2.5 rounded-xl bg-[#10b981]/10">
              <CheckCircle className="w-6 h-6 text-[#10b981]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{t("nav.delivered")}</h1>
              <p className="text-[#64748B] text-xs">{t("delivered.subtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refetch}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#64748B] hover:text-white hover:bg-[#111827] border border-[#1F2937] transition-all duration-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              {t("common.refresh")}
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#64748B] hover:text-white hover:bg-[#111827] border border-[#1F2937] transition-all duration-200"
            >
              <Download className="w-3.5 h-3.5" /> {t("common.export")}
            </button>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <DateFilter value={dateFilter} onChange={setDateFilter} />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: t("common.all") },
              { value: "processed", label: "Paid" },
              { value: "delivered", label: "Delivered" },
              { value: "shipped", label: "Shipped" },
              { value: "return", label: "Returned" },
              { value: "to prepare", label: "To Prepare" },
              { value: "prepared", label: "Prepared" },
              { value: "reprogrammer", label: "Reprogrammer" },
              { value: "rembourser", label: "Rembourser" },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={t("delivered.totalDeliveries")}
            value={formatNumber(stats.totalDeliveries)}
            icon={<Package className="w-5 h-5" />}
            color="primary"
            delay={0}
            subtitle={`${stats.countriesCount} countries`}
          />
          <StatCard
            title="Paid (COD Africa)"
            value={formatNumber(stats.paidOrders)}
            icon={<CheckCircle className="w-5 h-5" />}
            color="success"
            delay={50}
            subtitle={formatCurrency(stats.paidRevenue)}
          />
          <StatCard
            title="Delivered (to customer)"
            value={formatNumber(stats.deliveredOrders)}
            icon={<Package className="w-5 h-5" />}
            color="success"
            delay={75}
            subtitle={formatCurrency(stats.deliveredRevenue)}
          />
          <StatCard
            title={t("delivered.deliveryRate")}
            value={formatPercentage(stats.deliveryRate)}
            icon={<TrendingUp className="w-5 h-5" />}
            color="success"
            delay={100}
            subtitle="paid / (paid + returned)"
          />
          <StatCard
            title="Shipped"
            value={formatNumber(stats.shippedOrders)}
            icon={<Package className="w-5 h-5" />}
            color="primary"
            delay={125}
            subtitle={`${stats.toPrepareOrders} to prepare, ${stats.preparedOrders} prepared`}
          />
          <StatCard
            title="Returned"
            value={formatNumber(stats.returnedOrders)}
            icon={<TrendingDown className="w-5 h-5" />}
            color="error"
            delay={150}
            subtitle={`${stats.returnRate > 0 ? formatPercentage(stats.returnRate) : "0%"} return rate`}
          />
          <StatCard
            title="Reprogrammer"
            value={formatNumber(stats.reprogrammerOrders)}
            icon={<RefreshCw className="w-5 h-5" />}
            color="warning"
            delay={175}
            subtitle="rescheduled deliveries"
          />
          <StatCard
            title={t("delivered.countries")}
            value={formatNumber(stats.countriesCount)}
            icon={<Globe className="w-5 h-5" />}
            color="primary"
            delay={200}
            subtitle={t("delivered.withDeliveries")}
          />
        </div>

        <Card hover={false}>
          <CardHeader>
            <CardTitle>{t("delivered.deliveries")}</CardTitle>
            <span className="text-[#10b981] text-xs font-medium">{filteredByStatus.length} {t("delivered.deliveries").toLowerCase()}</span>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1F2937]">
                  <th className="text-left text-[#64748B] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">ID</th>
                  <th className="text-left text-[#64748B] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">{t("delivered.customer")}</th>
                  <th className="text-left text-[#64748B] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">{t("delivered.country")}</th>
                  <th className="text-left text-[#64748B] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">{t("delivered.date")}</th>
                  <th className="text-center text-[#64748B] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">{t("delivered.status")}</th>
                  <th className="text-right text-[#64748B] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">{t("delivered.revenue")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredByStatus.map((s) => (
                  <tr key={s._id} className="border-b border-[#1F2937]/50 transition-all duration-150 hover:bg-[#1E293B] group">
                    <td className="py-3.5 px-4">
                      <span className="text-white font-mono text-xs">{(s.id || s._id).substring(0, 12)}...</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-white text-sm">{s.customer?.fullName || "Unknown"}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        {COUNTRY_FLAGS[s.customer?.country || ""] && (
                          <img src={COUNTRY_FLAGS[s.customer?.country || ""]} alt={s.customer?.country || ""} className="w-5 h-3.5 rounded shadow-sm object-cover" />
                        )}
                        <span className="text-white text-sm">{s.customer?.country || ""}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[#94A3B8] text-sm">{new Date(s.updatedAt || s.date || s.createdAt).toLocaleDateString()}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(s.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-white font-semibold">{formatCurrency(s.totalPrice || 0)}</span>
                    </td>
                  </tr>
                ))}
                {filteredByStatus.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-[#64748B]">
                      {t("delivered.noDeliveries")}
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
