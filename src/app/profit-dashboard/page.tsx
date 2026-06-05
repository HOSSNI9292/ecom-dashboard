"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
  DollarSign, TrendingUp, Target, BarChart3, Percent,
  Package, Globe, PiggyBank, HandCoins, Truck,
  ArrowUpRight, ArrowDownRight, RefreshCw, Settings,
  AlertTriangle,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { PageWrapper } from "@/components/PageWrapper";
import { DateFilter } from "@/components/DateFilter";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { useProfitData } from "@/hooks/useProfitData";
import { formatCurrency, formatPercentage, getImageUrlOrFallback } from "@/utils";
import type { DateFilterValue } from "@/utils/dates";
import type { DatePreset } from "@/types/meta";

const META_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7d", label: "Last 7 Days" },
  { value: "last_30d", label: "Last 30 Days" },
  { value: "this_month", label: "This Month" },
];

function currencyFormatter(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function ProfitTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111827]/90 backdrop-blur-xl border border-[#334155] rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-[#94A3B8] text-xs mb-2 font-medium">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-white text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {currencyFormatter(entry.value)}
        </p>
      ))}
    </div>
  );
}

export default function ProfitDashboardPage() {
  const { t } = useTranslation();
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("30d");
  const [metaPreset, setMetaPreset] = useState<DatePreset>("last_30d");
  const [showDebug, setShowDebug] = useState(false);

  const {
    profitData,
    loading,
    error,
    refetch,
    hasMetaCredentials,
    configuredCosts,
  } = useProfitData(dateFilter, metaPreset);

  if (!profitData && loading) {
    return (
      <PageWrapper loading={true} error={null} onRetry={refetch} hasData={false}>
        <div className="space-y-6" />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper loading={loading && !profitData} error={error} onRetry={refetch} hasData={!!profitData}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <DateFilter value={dateFilter} onChange={setDateFilter} />
          <div className="flex items-center gap-2">
            <select
              value={metaPreset}
              onChange={(e) => setMetaPreset(e.target.value as DatePreset)}
              className="bg-[#111827] border border-[#1F2937] rounded-lg text-white text-xs px-2 py-1.5 focus:outline-none focus:border-[#6366F1]/50 cursor-pointer"
            >
              {META_PRESETS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <Link
              href="/settings/product-costs"
              className="p-1.5 rounded-lg text-[#64748B] hover:text-white hover:bg-[#111827] transition-all"
              title="Product Cost Settings"
            >
              <Settings className="w-4 h-4" />
            </Link>
            <button
              onClick={refetch}
              className="p-1.5 rounded-lg text-[#64748B] hover:text-white hover:bg-[#111827] transition-all"
              title={t("common.refresh")}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            {process.env.NODE_ENV === "development" && (
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-white hover:bg-[#111827] transition-all text-xs font-mono"
                title="Toggle debug panel"
              >
                {showDebug ? "✕" : "⚙"}
              </button>
            )}
          </div>
        </div>

        {profitData && !profitData.hasRealCosts && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B] text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Product costs not configured. Profit uses only revenue and ad spend.</span>
            <Link href="/settings/product-costs" className="underline font-medium hover:text-[#D97706] shrink-0 ml-auto">
              Configure now
            </Link>
          </div>
        )}

        {profitData && profitData.unconfiguredOrders > 0 && profitData.hasRealCosts && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 text-[#6366F1] text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{profitData.unconfiguredOrders} order(s) without product cost settings — costs defaulted to $0.</span>
            <Link href="/settings/product-costs" className="underline font-medium hover:text-[#5558E6] shrink-0 ml-auto">
              Fix
            </Link>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Revenue"
            value={currencyFormatter(profitData?.revenue ?? 0)}
            icon={<DollarSign className="w-5 h-5" />}
            color="success"
          />
          <KpiCard
            title="Ad Spend"
            value={currencyFormatter(profitData?.adSpend ?? 0)}
            icon={<Target className="w-5 h-5" />}
            color="warning"
            subtitle={!hasMetaCredentials ? "Meta not connected" : undefined}
          />
          <KpiCard
            title="Product Cost"
            value={currencyFormatter(profitData?.productCostTotal ?? 0)}
            icon={<Package className="w-5 h-5" />}
            color="primary"
            subtitle={`${configuredCosts} products configured`}
          />
          <KpiCard
            title="Shipping"
            value={currencyFormatter(profitData?.shippingTotal ?? 0)}
            icon={<Truck className="w-5 h-5" />}
            color="info"
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <KpiCard
            title="COD Fees"
            value={currencyFormatter(profitData?.codFeeTotal ?? 0)}
            icon={<HandCoins className="w-5 h-5" />}
            color="error"
          />
          <KpiCard
            title="Service Fees"
            value={currencyFormatter(profitData?.serviceFeeTotal ?? 0)}
            icon={<HandCoins className="w-5 h-5" />}
            color="error"
          />
          <KpiCard
            title="Net Profit"
            value={currencyFormatter(profitData?.netProfit ?? 0)}
            icon={<PiggyBank className="w-5 h-5" />}
            color={(profitData?.netProfit ?? 0) >= 0 ? "success" : "error"}
            subtitle="Revenue - All Costs"
          />
          <KpiCard
            title="Profit Margin"
            value={formatPercentage((profitData?.profitMargin ?? 0) / 100)}
            icon={<Percent className="w-5 h-5" />}
            color={(profitData?.profitMargin ?? 0) >= 15 ? "success" : (profitData?.profitMargin ?? 0) >= 0 ? "warning" : "error"}
          />
          <KpiCard
            title="ROAS"
            value={`${(profitData?.roas ?? 0).toFixed(2)}x`}
            icon={<BarChart3 className="w-5 h-5" />}
            color={(profitData?.roas ?? 0) >= 1.5 ? "success" : "warning"}
          />
          <KpiCard
            title="CPA"
            value={currencyFormatter(profitData?.cpa ?? 0)}
            icon={<Target className="w-5 h-5" />}
            color={(profitData?.cpa ?? 0) > 0 && (profitData?.cpa ?? Infinity) <= 50 ? "success" : "warning"}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Profit Trend</CardTitle>
            </CardHeader>
            <div className="h-[300px]">
              {profitData && profitData.profitTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={profitData.profitTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="60%" stopColor="#10B981" stopOpacity={0.05} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366F1" stopOpacity={0.3} />
                        <stop offset="60%" stopColor="#6366F1" stopOpacity={0.05} />
                        <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="#1F2937" vertical={false} />
                    <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={false} />
                    <YAxis stroke="#475569" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<ProfitTooltip />} cursor={{ stroke: "#475569", strokeWidth: 1, strokeDasharray: "4 4" }} />
                    <Area type="monotone" dataKey="revenue" stroke="#6366F1" strokeWidth={2} fill="url(#revGradient)" dot={false} name="Revenue" />
                    <Area type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} fill="url(#profitGradient)" dot={false} name="Profit" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[#64748B] text-sm">No data</div>
              )}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <ProfitEntityCard
            title="Best Product"
            items={profitData?.productProfitability.slice(0, 1) ?? []}
            type="product"
            variant="best"
          />
          <ProfitEntityCard
            title="Worst Product"
            items={profitData?.productProfitability.filter((p) => p.orders > 0).slice(-1) ?? []}
            type="product"
            variant="worst"
          />
          <ProfitEntityCard
            title="Best Country"
            items={profitData?.countryProfitability.slice(0, 1) ?? []}
            type="country"
            variant="best"
          />
          <ProfitEntityCard
            title="Worst Country"
            items={profitData?.countryProfitability.filter((c) => c.orders > 0).slice(-1) ?? []}
            type="country"
            variant="worst"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue per Product</CardTitle>
              <span className="text-[#94A3B8] text-xs font-medium">By revenue</span>
            </CardHeader>
            <div className="space-y-2">
              {([...(profitData?.productProfitability ?? [])].sort((a, b) => b.revenue - a.revenue)).map((p, i) => (
                <div key={p.code} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[#1F2937]/50 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0 ? "bg-[#10b981]/20 text-[#10b981]" : "bg-[#1F2937] text-[#64748B]"
                    }`}>
                      {i + 1}
                    </div>
                    <p className="text-white text-sm truncate">{p.name}</p>
                  </div>
                  <div className="text-right shrink-0 ms-2">
                    <p className="text-white text-sm font-semibold">{formatCurrency(p.revenue)}</p>
                  </div>
                </div>
              ))}
              {(!profitData?.productProfitability || profitData.productProfitability.length === 0) && (
                <p className="text-[#64748B] text-sm text-center py-4">{t("common.noData")}</p>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Orders per Product</CardTitle>
              <span className="text-[#94A3B8] text-xs font-medium">By orders</span>
            </CardHeader>
            <div className="space-y-2">
              {([...(profitData?.productProfitability ?? [])].sort((a, b) => b.orders - a.orders)).map((p, i) => (
                <div key={p.code} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[#1F2937]/50 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0 ? "bg-[#6366F1]/20 text-[#6366F1]" : "bg-[#1F2937] text-[#64748B]"
                    }`}>
                      {i + 1}
                    </div>
                    <p className="text-white text-sm truncate">{p.name}</p>
                  </div>
                  <div className="text-right shrink-0 ms-2">
                    <p className="text-white text-sm font-semibold">{p.orders} orders</p>
                  </div>
                </div>
              ))}
              {(!profitData?.productProfitability || profitData.productProfitability.length === 0) && (
                <p className="text-[#64748B] text-sm text-center py-4">{t("common.noData")}</p>
              )}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue per Country</CardTitle>
              <span className="text-[#94A3B8] text-xs font-medium">By revenue</span>
            </CardHeader>
            <div className="space-y-2">
              {([...(profitData?.countryProfitability ?? [])].sort((a, b) => b.revenue - a.revenue)).map((c, i) => (
                <div key={c.country} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[#1F2937]/50 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0 ? "bg-[#10b981]/20 text-[#10b981]" : "bg-[#1F2937] text-[#64748B]"
                    }`}>
                      {i + 1}
                    </div>
                    {c.flag && <img src={c.flag} alt={c.countryName} className="w-6 h-4 rounded object-cover" />}
                    <p className="text-white text-sm truncate">{c.countryName}</p>
                  </div>
                  <div className="text-right shrink-0 ms-2">
                    <p className="text-white text-sm font-semibold">{formatCurrency(c.revenue)}</p>
                  </div>
                </div>
              ))}
              {(!profitData?.countryProfitability || profitData.countryProfitability.length === 0) && (
                <p className="text-[#64748B] text-sm text-center py-4">{t("common.noData")}</p>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Orders per Country</CardTitle>
              <span className="text-[#94A3B8] text-xs font-medium">By orders</span>
            </CardHeader>
            <div className="space-y-2">
              {([...(profitData?.countryProfitability ?? [])].sort((a, b) => b.orders - a.orders)).map((c, i) => (
                <div key={c.country} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[#1F2937]/50 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0 ? "bg-[#6366F1]/20 text-[#6366F1]" : "bg-[#1F2937] text-[#64748B]"
                    }`}>
                      {i + 1}
                    </div>
                    {c.flag && <img src={c.flag} alt={c.countryName} className="w-6 h-4 rounded object-cover" />}
                    <p className="text-white text-sm truncate">{c.countryName}</p>
                  </div>
                  <div className="text-right shrink-0 ms-2">
                    <p className="text-white text-sm font-semibold">{c.orders} orders</p>
                  </div>
                </div>
              ))}
              {(!profitData?.countryProfitability || profitData.countryProfitability.length === 0) && (
                <p className="text-[#64748B] text-sm text-center py-4">{t("common.noData")}</p>
              )}
            </div>
          </Card>
        </div>

        {process.env.NODE_ENV !== "production" && showDebug && profitData?.__debug && (
          <DebugPanel debug={profitData.__debug} />
        )}
      </div>
    </PageWrapper>
  );
}

function KpiCard({ title, value, icon, color, subtitle }: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: "success" | "warning" | "error" | "primary" | "info";
  subtitle?: string;
}) {
  const colorMap: Record<string, string> = {
    success: "bg-[#10B981]/10 text-[#10B981]",
    warning: "bg-[#F59E0B]/10 text-[#F59E0B]",
    error: "bg-[#EF4444]/10 text-[#EF4444]",
    primary: "bg-[#6366F1]/10 text-[#6366F1]",
    info: "bg-[#6366F1]/10 text-[#6366F1]",
  };
  return (
    <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937]/80">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          {icon}
        </div>
        <span className="text-[#94A3B8] text-xs font-medium uppercase tracking-wider">{title}</span>
      </div>
      <p className="text-white text-lg font-bold truncate">{value}</p>
      {subtitle && <p className="text-[#64748B] text-[10px] mt-1">{subtitle}</p>}
    </div>
  );
}

function DebugPanel({ debug }: {
  debug: { totalOrdersFetched: number; totalDelivered: number; totalConfirmed: number; uniqueProducts: number; uniqueCountries: number; first10Products: { name: string; code: string }[]; first10Countries: string[]; sampleOrderRaw: string; dateFilterLabel: string };
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="text-[#F59E0B] text-xs font-mono font-bold">DEBUG</span>
          <CardTitle>COD Africa Data Inspection</CardTitle>
        </div>
      </CardHeader>
      <div className="px-6 pb-6 space-y-4 text-sm font-mono">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-[#1F2937]/50">
            <p className="text-[#64748B] text-[10px] uppercase tracking-wider">Total Orders Fetched</p>
            <p className="text-white text-lg font-bold">{debug.totalOrdersFetched}</p>
          </div>
          <div className="p-3 rounded-lg bg-[#1F2937]/50">
            <p className="text-[#64748B] text-[10px] uppercase tracking-wider">Delivered</p>
            <p className="text-[#10B981] text-lg font-bold">{debug.totalDelivered}</p>
          </div>
          <div className="p-3 rounded-lg bg-[#1F2937]/50">
            <p className="text-[#64748B] text-[10px] uppercase tracking-wider">Confirmed</p>
            <p className="text-[#8B5CF6] text-lg font-bold">{debug.totalConfirmed}</p>
          </div>
          <div className="p-3 rounded-lg bg-[#1F2937]/50">
            <p className="text-[#64748B] text-[10px] uppercase tracking-wider">Date Filter</p>
            <p className="text-white text-lg font-bold">{debug.dateFilterLabel}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-[#1F2937]/50">
            <p className="text-[#64748B] text-[10px] uppercase tracking-wider">Unique Products</p>
            <p className="text-white text-lg font-bold">{debug.uniqueProducts}</p>
          </div>
          <div className="p-3 rounded-lg bg-[#1F2937]/50">
            <p className="text-[#64748B] text-[10px] uppercase tracking-wider">Unique Countries</p>
            <p className="text-white text-lg font-bold">{debug.uniqueCountries}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-[#1F2937]/50">
            <p className="text-[#64748B] text-[10px] uppercase tracking-wider mb-2">First 10 Products</p>
            <div className="space-y-1">
              {debug.first10Products.map((p, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-white truncate">{p.name}</span>
                  <span className="text-[#64748B] shrink-0 ml-2">{p.code}</span>
                </div>
              ))}
              {debug.first10Products.length === 0 && <span className="text-[#EF4444] text-xs">No products found</span>}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#1F2937]/50">
            <p className="text-[#64748B] text-[10px] uppercase tracking-wider mb-2">First 10 Countries</p>
            <div className="space-y-1">
              {debug.first10Countries.map((c, i) => (
                <div key={i} className="text-xs text-white">{c}</div>
              ))}
              {debug.first10Countries.length === 0 && <span className="text-[#EF4444] text-xs">No countries found</span>}
            </div>
          </div>
        </div>
        <div>
          <p className="text-[#64748B] text-[10px] uppercase tracking-wider mb-2">Raw Order Sample (first order)</p>
          <pre className="p-3 rounded-lg bg-[#0F172A] border border-[#1F2937] text-[10px] text-[#94A3B8] max-h-48 overflow-auto whitespace-pre-wrap">
            {debug.sampleOrderRaw}
          </pre>
        </div>
      </div>
    </Card>
  );
}

function ProfitEntityCard({ title, items, type, variant }: {
  title: string;
  items: { name?: string; countryName?: string; revenue?: number; profit?: number; margin?: number; image?: string; flag?: string }[];
  type: "product" | "country";
  variant: "best" | "worst";
}) {
  const item = items[0];
  if (!item) {
    return (
      <Card hover={false} className={variant === "best" ? "border-[#10B981]/20" : "border-[#EF4444]/20"}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <p className="px-6 pb-6 text-[#64748B] text-sm">No data</p>
      </Card>
    );
  }

  const displayName = type === "country" ? item.countryName : item.name;

  return (
    <Card
      hover={false}
      className={variant === "best"
        ? "bg-gradient-to-br from-[#10B981]/10 via-[#111827] to-[#111827] border-[#10B981]/20"
        : "bg-gradient-to-br from-[#EF4444]/10 via-[#111827] to-[#111827] border-[#EF4444]/20"
      }
    >
      <CardHeader>
        <div className="flex items-center gap-2">
          {variant === "best" ? (
            <ArrowUpRight className="w-4 h-4 text-[#10B981]" />
          ) : (
            <ArrowDownRight className="w-4 h-4 text-[#EF4444]" />
          )}
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <div className="px-6 pb-6">
        <div className="flex items-center gap-3 mb-3">
          {type === "country" && item.flag && (
            <img src={item.flag} alt={displayName} className="w-10 h-7 rounded object-cover" />
          )}
          {type === "product" && item.image && (
            <div className="w-10 h-10 rounded-lg bg-[#1F2937] flex items-center justify-center overflow-hidden">
              <img src={getImageUrlOrFallback(item.image)} alt={displayName || ""} className="w-full h-full object-contain p-1" />
            </div>
          )}
          <p className="text-white font-semibold truncate">{displayName}</p>
        </div>
        <div className="flex items-center gap-4">
          <div>
            <p className={`text-lg font-bold ${variant === "best" ? "text-[#10B981]" : "text-[#EF4444]"}`}>
              {currencyFormatter(item.profit ?? 0)}
            </p>
            <p className="text-[#94A3B8] text-[10px]">Profit</p>
          </div>
          <div className="w-px h-8 bg-[#1F2937]/80" />
          <div>
            <p className="text-white text-sm font-semibold">{formatPercentage((item.margin ?? 0) / 100)}</p>
            <p className="text-[#94A3B8] text-[10px]">Margin</p>
          </div>
          <div className="w-px h-8 bg-[#1F2937]/80" />
          <div>
            <p className="text-white text-sm font-semibold">{currencyFormatter(item.revenue ?? 0)}</p>
            <p className="text-[#94A3B8] text-[10px]">Revenue</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
