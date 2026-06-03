"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  ShieldAlert, ShieldCheck, AlertTriangle, TrendingDown,
  Flag, FlagOff, Search, Download, RefreshCw, Eye
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { PageWrapper } from "@/components/PageWrapper";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { DateFilter } from "@/components/DateFilter";
import { Modal } from "@/components/ui/Modal";
import { useDashboardData } from "@/hooks";
import { formatNumber, formatCurrency, formatPercentage, filterOrdersByDate } from "@/utils";
import { getFlaggedProducts, flagProduct, unflagProduct, isProductFlagged } from "@/utils/fraud";
import { exportToCSV } from "@/utils/csv";
import type { Order } from "@/types";
import type { DateFilterValue } from "@/utils/dates";

interface ProductFraudAnalysis {
  productCode: string;
  productName: string;
  productImage?: string;
  totalOrders: number;
  cancelled: number;
  double: number;
  transferred: number;
  outOfStock: number;
  pending: number;
  confirmed: number;
  delivered: number;
  fakeOrders: number;
  fakeRate: number;
  revenue: number;
  fakeRevenue: number;
  isFlagged: boolean;
  riskLevel: "high" | "medium" | "low" | "safe";
}

const FAKE_STATUSES = ["cancelled", "double", "transferred"];

export default function FraudDetectionPage() {
  const { data, loading, error, refetch } = useDashboardData();
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("all");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [sortBy, setSortBy] = useState("fakeRate");
  const [country, setCountry] = useState("");
  const [flaggedProducts, setFlaggedProducts] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductFraudAnalysis | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const [showFlagModal, setShowFlagModal] = useState(false);

  useEffect(() => {
    setFlaggedProducts(getFlaggedProducts().map((f) => f.productCode));
  }, []);

  const allOrders = data?.orders ?? [];
  const filteredOrders = useMemo(() => {
    let list = filterOrdersByDate(allOrders, dateFilter);
    if (country) list = list.filter((o) => o.country === country);
    return list;
  }, [allOrders, dateFilter, country]);

  const countries = useMemo(() => {
    const seen = new Set<string>();
    return allOrders.filter((o) => {
      if (seen.has(o.country)) return false;
      seen.add(o.country);
      return true;
    }).map((o) => ({ label: o.countryName || o.country, value: o.country })).sort((a, b) => a.label.localeCompare(b.label));
  }, [allOrders]);

  const productAnalysis = useMemo((): ProductFraudAnalysis[] => {
    const map = new Map<string, ProductFraudAnalysis>();

    for (const o of filteredOrders as Order[]) {
      const key = o.productCode || o.productName;
      if (!key) continue;

      if (!map.has(key)) {
        map.set(key, {
          productCode: key,
          productName: o.productName,
          productImage: o.productImage,
          totalOrders: 0,
          cancelled: 0,
          double: 0,
          transferred: 0,
          outOfStock: 0,
          pending: 0,
          confirmed: 0,
          delivered: 0,
          fakeOrders: 0,
          fakeRate: 0,
          revenue: 0,
          fakeRevenue: 0,
          isFlagged: flaggedProducts.includes(key),
          riskLevel: "safe",
        });
      }

      const p = map.get(key)!;
      p.totalOrders += 1;
      p.revenue += o.amount;

      if (o.status === "cancelled") { p.cancelled += 1; p.fakeOrders += 1; p.fakeRevenue += o.amount; }
      else if (o.status === "double") { p.double += 1; p.fakeOrders += 1; p.fakeRevenue += o.amount; }
      else if (o.status === "transferred") { p.transferred += 1; p.fakeOrders += 1; p.fakeRevenue += o.amount; }
      else if (o.status === "out_of_stock") p.outOfStock += 1;
      else if (o.status === "pending") p.pending += 1;
      else if (o.status === "confirmed") p.confirmed += 1;
      else if (o.status === "delivered" || o.status === "shipping") p.delivered += 1;
    }

    for (const p of map.values()) {
      p.fakeRate = p.totalOrders > 0 ? p.fakeOrders / p.totalOrders : 0;
      p.isFlagged = flaggedProducts.includes(p.productCode);

      if (p.fakeRate >= 0.5) p.riskLevel = "high";
      else if (p.fakeRate >= 0.3) p.riskLevel = "medium";
      else if (p.fakeRate >= 0.15) p.riskLevel = "low";
      else p.riskLevel = "safe";
    }

    return Array.from(map.values());
  }, [filteredOrders, flaggedProducts]);

  const filtered = useMemo(() => {
    let list = productAnalysis;

    if (search) {
      const s = search.toLowerCase();
      list = list.filter((p) =>
        p.productName.toLowerCase().includes(s) ||
        p.productCode.toLowerCase().includes(s)
      );
    }

    if (filterType === "flagged") list = list.filter((p) => p.isFlagged);
    else if (filterType === "high") list = list.filter((p) => p.riskLevel === "high");
    else if (filterType === "medium") list = list.filter((p) => p.riskLevel === "medium");
    else if (filterType === "suspicious") list = list.filter((p) => p.fakeRate >= 0.3);

    if (sortBy === "fakeRate") list.sort((a, b) => b.fakeRate - a.fakeRate);
    else if (sortBy === "fakeOrders") list.sort((a, b) => b.fakeOrders - a.fakeOrders);
    else if (sortBy === "totalOrders") list.sort((a, b) => b.totalOrders - a.totalOrders);
    else if (sortBy === "name") list.sort((a, b) => a.productName.localeCompare(b.productName));

    return list;
  }, [productAnalysis, search, filterType, sortBy]);

  const stats = useMemo(() => {
    const totalFakeOrders = productAnalysis.reduce((s, p) => s + p.fakeOrders, 0);
    const totalOrders = productAnalysis.reduce((s, p) => s + p.totalOrders, 0);
    const highRisk = productAnalysis.filter((p) => p.riskLevel === "high").length;
    const flagged = productAnalysis.filter((p) => p.isFlagged).length;
    const totalFakeRevenue = productAnalysis.reduce((s, p) => s + p.fakeRevenue, 0);
    return { totalFakeOrders, totalOrders, highRisk, flagged, totalFakeRevenue };
  }, [productAnalysis]);

  const handleFlag = useCallback((product: ProductFraudAnalysis) => {
    setSelectedProduct(product);
    setFlagReason("");
    setShowFlagModal(true);
  }, []);

  const confirmFlag = useCallback(() => {
    if (!selectedProduct) return;
    flagProduct(selectedProduct.productCode, selectedProduct.productName, flagReason || "Fake orders detected");
    setFlaggedProducts(getFlaggedProducts().map((f) => f.productCode));
    setShowFlagModal(false);
    setSelectedProduct(null);
  }, [selectedProduct, flagReason]);

  const handleUnflag = useCallback((productCode: string) => {
    unflagProduct(productCode);
    setFlaggedProducts(getFlaggedProducts().map((f) => f.productCode));
  }, []);

  const handleExport = useCallback(() => {
    exportToCSV(
      filtered.map((p) => ({
        product: p.productName,
        code: p.productCode,
        totalOrders: p.totalOrders,
        fakeOrders: p.fakeOrders,
        cancelled: p.cancelled,
        double: p.double,
        confirmed: p.confirmed,
        transferred: p.transferred,
        fakeRate: `${(p.fakeRate * 100).toFixed(1)}%`,
        riskLevel: p.riskLevel,
        flagged: p.isFlagged ? "Yes" : "No",
        revenue: p.revenue,
        fakeRevenue: p.fakeRevenue,
      })),
      "fraud_analysis",
      {
        product: "Product", code: "Code", totalOrders: "Total Orders",
        fakeOrders: "Fake Orders", cancelled: "Cancelled", double: "Double",
        confirmed: "Confirmed", transferred: "Transferred", fakeRate: "Fake Rate",
        riskLevel: "Risk Level", flagged: "Flagged", revenue: "Revenue (XOF)",
        fakeRevenue: "Fake Revenue (XOF)",
      }
    );
  }, [filtered]);

  const getRiskColor = (level: string) => {
    if (level === "high") return "text-[#ef4444]";
    if (level === "medium") return "text-[#f59e0b]";
    if (level === "low") return "text-[#eab308]";
    return "text-[#10b981]";
  };

  const getRiskBg = (level: string) => {
    if (level === "high") return "bg-[#ef4444]/10 border-[#ef4444]/20";
    if (level === "medium") return "bg-[#f59e0b]/10 border-[#f59e0b]/20";
    if (level === "low") return "bg-[#eab308]/10 border-[#eab308]/20";
    return "bg-[#10b981]/10 border-[#10b981]/20";
  };

  return (
    <PageWrapper loading={loading && !data} error={error} onRetry={refetch} hasData={!!data}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#ef4444]/10">
              <ShieldAlert className="w-6 h-6 text-[#ef4444]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Fraud Detection</h1>
              <p className="text-[#64748B] text-xs">Identify products with fake orders</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refetch} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#64748B] hover:text-white hover:bg-[#111827] border border-[#1F2937] transition-all duration-200">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#64748B] hover:text-white hover:bg-[#111827] border border-[#1F2937] transition-all duration-200">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <DateFilter value={dateFilter} onChange={setDateFilter} />
          <Select
            value={country}
            onChange={setCountry}
            options={[{ label: "All Countries", value: "" }, ...countries]}
            className="w-full sm:w-44"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Total Fake Orders" value={formatNumber(stats.totalFakeOrders)} icon={<AlertTriangle className="w-5 h-5" />} color="error" delay={0} subtitle={`${formatPercentage(stats.totalOrders > 0 ? stats.totalFakeOrders / stats.totalOrders : 0)} of all orders`} />
          <StatCard title="High Risk Products" value={formatNumber(stats.highRisk)} icon={<ShieldAlert className="w-5 h-5" />} color="error" delay={50} subtitle="50%+ fake rate" />
          <StatCard title="Flagged Products" value={formatNumber(stats.flagged)} icon={<Flag className="w-5 h-5" />} color="warning" delay={100} subtitle="Stop ads for these" />
          <StatCard title="Fake Revenue Lost" value={formatCurrency(stats.totalFakeRevenue)} icon={<TrendingDown className="w-5 h-5" />} color="error" delay={150} subtitle="From fake orders" />
          <StatCard title="Products Analyzed" value={formatNumber(productAnalysis.length)} icon={<Eye className="w-5 h-5" />} color="primary" delay={200} />
        </div>

        <Card hover={false}>
          <CardHeader>
            <CardTitle>High Risk Products - Stop Ads</CardTitle>
            <span className="text-[#ef4444] text-xs font-medium">{productAnalysis.filter((p) => p.riskLevel === "high").length} products</span>
          </CardHeader>
          <div className="space-y-2">
            {productAnalysis.filter((p) => p.riskLevel === "high").slice(0, 5).map((p) => (
              <div key={p.productCode} className="flex items-center justify-between py-3 px-4 rounded-xl bg-[#ef4444]/5 border border-[#ef4444]/20 hover:bg-[#ef4444]/10 transition-all duration-200">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-[#ef4444]/10 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-5 h-5 text-[#ef4444]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{p.productName}</p>
                    <p className="text-[#64748B] text-xs">{p.productCode}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-3">
                  <div className="text-right">
                    <p className="text-[#ef4444] text-lg font-bold">{formatPercentage(p.fakeRate)}</p>
                    <p className="text-[#64748B] text-xs">{p.fakeOrders}/{p.totalOrders} fake</p>
                  </div>
                  {p.isFlagged ? (
                    <button onClick={() => handleUnflag(p.productCode)} className="p-2 rounded-lg bg-[#10b981]/10 text-[#10b981] hover:bg-[#10b981]/20 transition-all" title="Unflag - Resume ads">
                      <FlagOff className="w-4 h-4" />
                    </button>
                  ) : (
                    <button onClick={() => handleFlag(p)} className="p-2 rounded-lg bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444]/20 transition-all" title="Flag - Stop ads">
                      <Flag className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {productAnalysis.filter((p) => p.riskLevel === "high").length === 0 && (
              <div className="text-center py-8">
                <ShieldCheck className="w-12 h-12 text-[#10b981] mx-auto mb-2" />
                <p className="text-[#10b981] text-sm font-medium">No high risk products detected</p>
              </div>
            )}
          </div>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-start">
          <div className="flex-1 min-w-[200px]">
            <SearchInput value={search} onChange={setSearch} placeholder="Search products..." />
          </div>
          <Select
            value={filterType}
            onChange={setFilterType}
            options={[
              { label: "All Products", value: "" },
              { label: "Flagged Only", value: "flagged" },
              { label: "High Risk", value: "high" },
              { label: "Medium Risk", value: "medium" },
              { label: "Suspicious (30%+)", value: "suspicious" },
            ]}
            className="w-full sm:w-44"
          />
          <Select
            value={sortBy}
            onChange={setSortBy}
            options={[
              { label: "Fake Rate (High)", value: "fakeRate" },
              { label: "Fake Orders (High)", value: "fakeOrders" },
              { label: "Total Orders", value: "totalOrders" },
              { label: "Name A-Z", value: "name" },
            ]}
            className="w-full sm:w-44"
          />
        </div>

        <Card hover={false}>
          <CardHeader>
            <CardTitle>All Products Analysis</CardTitle>
            <span className="text-[#64748B] text-xs">{filtered.length} products</span>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1F2937]">
                  <th className="text-left text-[#64748B] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Product</th>
                  <th className="text-center text-[#64748B] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Total</th>
                  <th className="text-center text-[#64748B] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Fake</th>
                  <th className="text-center text-[#64748B] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Cancelled</th>
                  <th className="text-center text-[#64748B] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Double</th>
                  <th className="text-center text-[#64748B] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Confirmed</th>
                  <th className="text-center text-[#64748B] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Fake Rate</th>
                  <th className="text-center text-[#64748B] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Risk</th>
                  <th className="text-center text-[#64748B] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Status</th>
                  <th className="text-center text-[#64748B] text-xs font-semibold uppercase tracking-wider py-3.5 px-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.productCode} className="border-b border-[#1F2937]/50 transition-all duration-150 hover:bg-[#1E293B] group">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#1F2937] flex items-center justify-center shrink-0 overflow-hidden">
                          {p.productImage ? (
                            <img src={p.productImage} alt={p.productName} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <ShieldAlert className="w-4 h-4 text-[#64748B]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate max-w-[200px]">{p.productName}</p>
                          <p className="text-[#64748B] text-xs">{p.productCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center text-white font-medium">{formatNumber(p.totalOrders)}</td>
                    <td className="py-3.5 px-4 text-center text-[#ef4444] font-semibold">{formatNumber(p.fakeOrders)}</td>
                    <td className="py-3.5 px-4 text-center text-[#f59e0b]">{formatNumber(p.cancelled)}</td>
                    <td className="py-3.5 px-4 text-center text-[#8b5cf6]">{formatNumber(p.double)}</td>
                    <td className="py-3.5 px-4 text-center text-[#10b981] font-semibold">{formatNumber(p.confirmed)}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`text-sm font-bold ${getRiskColor(p.riskLevel)}`}>{formatPercentage(p.fakeRate)}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getRiskBg(p.riskLevel)}`}>
                        {p.riskLevel === "high" && <ShieldAlert className="w-3 h-3" />}
                        {p.riskLevel.charAt(0).toUpperCase() + p.riskLevel.slice(1)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {p.isFlagged ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20">
                          <Flag className="w-3 h-3" /> Flagged
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-[#1F2937] text-[#64748B] border border-[#1F2937]">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {p.isFlagged ? (
                        <button onClick={() => handleUnflag(p.productCode)} className="p-2 rounded-lg text-[#10b981] hover:bg-[#10b981]/10 transition-all" title="Unflag - Resume ads">
                          <FlagOff className="w-4 h-4" />
                        </button>
                      ) : (
                        <button onClick={() => handleFlag(p)} className="p-2 rounded-lg text-[#ef4444] hover:bg-[#ef4444]/10 transition-all" title="Flag - Stop ads">
                          <Flag className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="text-center py-12 text-[#64748B]">No products found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal open={showFlagModal} onClose={() => setShowFlagModal(false)} title="Flag Product - Stop Ads">
        {selectedProduct && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#ef4444]/5 border border-[#ef4444]/20">
              <p className="text-white font-medium">{selectedProduct.productName}</p>
              <p className="text-[#64748B] text-xs mt-1">{selectedProduct.productCode}</p>
              <div className="flex items-center gap-4 mt-3">
                <div>
                  <p className="text-[#ef4444] text-lg font-bold">{formatPercentage(selectedProduct.fakeRate)}</p>
                  <p className="text-[#64748B] text-xs">Fake Rate</p>
                </div>
                <div>
                  <p className="text-white text-lg font-bold">{selectedProduct.fakeOrders}</p>
                  <p className="text-[#64748B] text-xs">Fake Orders</p>
                </div>
                <div>
                  <p className="text-[#f59e0b] text-lg font-bold">{formatCurrency(selectedProduct.fakeRevenue)}</p>
                  <p className="text-[#64748B] text-xs">Lost Revenue</p>
                </div>
              </div>
            </div>
            <div>
              <label className="text-[#94A3B8] text-sm font-medium block mb-2">Reason (optional)</label>
              <input
                type="text"
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                placeholder="e.g., Too many cancellations, fake leads..."
                className="w-full px-4 py-2.5 bg-[#0B0F19] border border-[#1F2937] rounded-lg text-white text-sm placeholder:text-[#475569] focus:outline-none focus:border-[#ef4444]/50"
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={confirmFlag}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-lg transition-all duration-200 text-sm font-medium"
              >
                <Flag className="w-4 h-4" /> Confirm Flag - Stop Ads
              </button>
              <button
                onClick={() => setShowFlagModal(false)}
                className="px-4 py-2.5 bg-[#1F2937] hover:bg-[#334155] text-white rounded-lg transition-all duration-200 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}
