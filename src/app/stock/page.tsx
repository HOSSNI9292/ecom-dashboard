"use client";

import { useTranslation } from "react-i18next";
import { Warehouse, AlertTriangle, Package, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { PageWrapper } from "@/components/PageWrapper";
import { SearchInput } from "@/components/ui/SearchInput";
import { DateFilter } from "@/components/DateFilter";
import { useLowStockProducts, useOutOfStockProducts, useDashboardData } from "@/hooks";
import { formatNumber, formatCurrency, filterOrdersByDate } from "@/utils";
import { useState, useMemo } from "react";
import type { Product, Order } from "@/types";
import type { DateFilterValue } from "@/utils/dates";

export default function StockPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("all");
  const allData = useDashboardData({ refreshInterval: 30000 });
  const lowStock = useLowStockProducts({ refreshInterval: 30000 });
  const outOfStock = useOutOfStockProducts({ refreshInterval: 30000 });

  const stats = allData.data?.stats;
  const allProducts = allData.data?.products ?? [];
  const allOrders = allData.data?.orders ?? [];
  const filteredOrders = useMemo(() => filterOrdersByDate(allOrders, dateFilter), [allOrders, dateFilter]);

  const uniqueProducts = new Map<string, Product>();

  if (dateFilter !== "all") {
    for (const o of filteredOrders as Order[]) {
      const key = o.productCode || o.productName;
      if (!key) continue;
      if (uniqueProducts.has(key)) {
        const ex = uniqueProducts.get(key)!;
        ex.totalSold += o.quantity;
        ex.revenue += o.amount;
      } else {
        const existingProduct = allProducts.find((p: Product) => p.code === key || p.name === key);
        uniqueProducts.set(key, {
          id: key,
          name: o.productName,
          code: o.productCode || "",
          totalSold: o.quantity,
          revenue: o.amount,
          stockQuantity: existingProduct?.stockQuantity ?? 999,
          warehouse: existingProduct?.warehouse ?? "",
          country: o.country,
          countryName: o.countryName || o.country,
          currency: "XOF",
          price: o.quantity > 0 ? Math.round(o.amount / o.quantity) : 0,
          image: o.productImage,
        });
      }
    }
  } else {
    for (const p of allProducts) {
      if (!uniqueProducts.has(p.id)) uniqueProducts.set(p.id, p);
      else {
        const ex = uniqueProducts.get(p.id)!;
        ex.totalSold += p.totalSold;
        ex.revenue += p.revenue;
      }
    }
  }
  const uniqueProductList = Array.from(uniqueProducts.values());
  const inStock = uniqueProductList.filter((p) => p.stockQuantity > 10).length;
  const loading = allData.loading && !allData.data;
  const error = allData.error;

  const stockHealth = useMemo(() => {
    const total = uniqueProductList.length;
    if (total === 0) return { healthy: 0, low: 0, out: 0, healthyPct: 0, lowPct: 0, outPct: 0 };
    const healthy = uniqueProductList.filter((p) => p.stockQuantity > 10).length;
    const low = uniqueProductList.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= 10).length;
    const out = uniqueProductList.filter((p) => p.stockQuantity === 0).length;
    return {
      healthy, low, out,
      healthyPct: (healthy / total) * 100,
      lowPct: (low / total) * 100,
      outPct: (out / total) * 100,
    };
  }, [uniqueProductList]);

  const filteredInventory = uniqueProductList
    .filter((p) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return p.name.toLowerCase().includes(s) || p.code.toLowerCase().includes(s);
    })
    .sort((a, b) => a.stockQuantity - b.stockQuantity);

  return (
    <PageWrapper loading={loading} error={error} onRetry={allData.refetch} hasData={uniqueProductList.length > 0}>
      <div className="space-y-6">
        <DateFilter value={dateFilter} onChange={setDateFilter} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title={t("stock.totalProducts")} value={formatNumber(uniqueProductList.length)} icon={<Package className="w-5 h-5" />} color="primary" delay={0} />
          <StatCard title={t("stock.inStock")} value={formatNumber(inStock)} icon={<Warehouse className="w-5 h-5" />} color="success" delay={50} />
          <StatCard title={t("stock.lowStock")} value={formatNumber(lowStock.data?.length ?? 0)} icon={<AlertTriangle className="w-5 h-5" />} color="warning" delay={100} subtitle={t("stock.tenOrLess")} />
          <StatCard title={t("stock.outOfStock")} value={formatNumber(outOfStock.data?.length ?? 0)} icon={<AlertTriangle className="w-5 h-5" />} color="error" delay={150} subtitle={t("stock.needRestock")} />
        </div>

        <Card hover={false}>
          <CardHeader>
            <CardTitle>{t("stock.healthOverview")}</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-3 bg-[#1F2937] rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-[#10b981] transition-all duration-500"
                  style={{ width: `${stockHealth.healthyPct}%` }}
                  title={`${t("stock.healthy")}: ${stockHealth.healthy}`}
                />
                <div
                  className="h-full bg-[#f59e0b] transition-all duration-500"
                  style={{ width: `${stockHealth.lowPct}%` }}
                  title={`${t("stock.low")}: ${stockHealth.low}`}
                />
                <div
                  className="h-full bg-[#ef4444] transition-all duration-500"
                  style={{ width: `${stockHealth.outPct}%` }}
                  title={`${t("stock.out")}: ${stockHealth.out}`}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-xl bg-[#10b981]/5 border border-[#10b981]/10">
                <p className="text-[#10b981] text-2xl font-bold">{stockHealth.healthy}</p>
                <p className="text-[#64748B] text-xs mt-0.5">{t("stock.healthy")}</p>
                <p className="text-[#10b981] text-xs">{stockHealth.healthyPct.toFixed(0)}%</p>
              </div>
              <div className="p-3 rounded-xl bg-[#f59e0b]/5 border border-[#f59e0b]/10">
                <p className="text-[#f59e0b] text-2xl font-bold">{stockHealth.low}</p>
                <p className="text-[#64748B] text-xs mt-0.5">{t("stock.lowStock")}</p>
                <p className="text-[#f59e0b] text-xs">{stockHealth.lowPct.toFixed(0)}%</p>
              </div>
              <div className="p-3 rounded-xl bg-[#ef4444]/5 border border-[#ef4444]/10">
                <p className="text-[#ef4444] text-2xl font-bold">{stockHealth.out}</p>
                <p className="text-[#64748B] text-xs mt-0.5">{t("stock.outOfStock")}</p>
                <p className="text-[#ef4444] text-xs">{stockHealth.outPct.toFixed(0)}%</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card gradient>
            <CardHeader>
              <CardTitle>{t("stock.lowStockProducts")}</CardTitle>
              <span className="text-[#f59e0b] text-xs font-medium">{lowStock.data?.length ?? 0} items</span>
            </CardHeader>
            {lowStock.loading && !lowStock.data ? (
              <div className="py-12 flex justify-center">
                <div className="relative">
                  <div className="w-8 h-8 border-2 border-[#1F2937] rounded-full" />
                  <div className="w-8 h-8 border-2 border-transparent border-t-[#f59e0b] rounded-full animate-spin absolute inset-0" />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {(lowStock.data ?? []).slice(0, 20).map((p: Product) => (
                  <div key={p.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[#f59e0b]/5 border border-[#f59e0b]/10 hover:bg-[#f59e0b]/10 transition-all duration-200">
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-medium truncate">{p.name}</p>
                      <p className="text-[#64748B] text-xs">{p.code}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="text-[#f59e0b] font-bold text-lg">{formatNumber(p.stockQuantity)}</span>
                      <div className="flex flex-col items-end">
                        <span className="text-[#94A3B8] text-xs">{formatNumber(p.totalSold)} {t("dashboard.sold").toLowerCase()}</span>
                        <span className="text-[#64748B] text-xs">{formatCurrency(p.revenue)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {(!lowStock.data || lowStock.data.length === 0) && (
                  <div className="text-center py-8">
                    <p className="text-[#10b981] text-sm font-medium">{t("stock.allWellStocked")}</p>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card gradient>
            <CardHeader>
              <CardTitle>{t("stock.outOfStockProducts")}</CardTitle>
              <span className="text-[#ef4444] text-xs font-medium">{outOfStock.data?.length ?? 0} items</span>
            </CardHeader>
            {outOfStock.loading && !outOfStock.data ? (
              <div className="py-12 flex justify-center">
                <div className="relative">
                  <div className="w-8 h-8 border-2 border-[#1F2937] rounded-full" />
                  <div className="w-8 h-8 border-2 border-transparent border-t-[#ef4444] rounded-full animate-spin absolute inset-0" />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {(outOfStock.data ?? []).slice(0, 20).map((p: Product) => (
                  <div key={p.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[#ef4444]/5 border border-[#ef4444]/10 hover:bg-[#ef4444]/10 transition-all duration-200">
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-medium truncate">{p.name}</p>
                      <p className="text-[#64748B] text-xs">{p.code}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="text-[#ef4444] font-bold text-lg">0</span>
                      <div className="flex flex-col items-end">
                        <span className="text-[#94A3B8] text-xs">{formatNumber(p.totalSold)} {t("dashboard.sold").toLowerCase()}</span>
                        <span className="text-[#64748B] text-xs">{formatCurrency(p.revenue)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {(!outOfStock.data || outOfStock.data.length === 0) && (
                  <div className="text-center py-8">
                    <p className="text-[#10b981] text-sm font-medium">{t("stock.noOutOfStock")}</p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        <Card hover={false}>
          <CardHeader>
            <CardTitle>{t("stock.productInventory")}</CardTitle>
            <div className="w-64">
              <SearchInput value={search} onChange={setSearch} placeholder={t("common.search")} />
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1F2937]">
                  <th className="text-left text-[#64748B] text-xs font-semibold uppercase tracking-wider py-3.5 px-4 sticky top-0 bg-[#111827]">{t("delivered.product")}</th>
                  <th className="text-right text-[#64748B] text-xs font-semibold uppercase tracking-wider py-3.5 px-4 sticky top-0 bg-[#111827]">{t("products.stock")}</th>
                  <th className="text-right text-[#64748B] text-xs font-semibold uppercase tracking-wider py-3.5 px-4 sticky top-0 bg-[#111827]">{t("dashboard.sold")}</th>
                  <th className="text-right text-[#64748B] text-xs font-semibold uppercase tracking-wider py-3.5 px-4 sticky top-0 bg-[#111827]">{t("dashboard.revenue")}</th>
                  <th className="text-center text-[#64748B] text-xs font-semibold uppercase tracking-wider py-3.5 px-4 sticky top-0 bg-[#111827]">{t("delivered.status")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((p: Product) => (
                  <tr key={p.id} className="border-b border-[#1F2937]/50 transition-all duration-150 hover:bg-[#1E293B] group">
                    <td className="py-3.5 px-4">
                      <p className="text-white text-sm font-medium">{p.name}</p>
                      <p className="text-[#64748B] text-xs">{p.code}</p>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-[#1F2937] overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              p.stockQuantity === 0 ? "bg-[#ef4444]" :
                              p.stockQuantity <= 10 ? "bg-[#f59e0b]" : "bg-[#10b981]"
                            }`}
                            style={{ width: `${Math.min((p.stockQuantity / 50) * 100, 100)}%` }}
                          />
                        </div>
                        <span className={`font-medium w-8 text-right ${
                          p.stockQuantity === 0 ? "text-[#ef4444]" :
                          p.stockQuantity <= 10 ? "text-[#f59e0b]" : "text-white"
                        }`}>
                          {formatNumber(p.stockQuantity)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right text-[#94A3B8]">{formatNumber(p.totalSold)}</td>
                    <td className="py-3.5 px-4 text-right text-white font-medium">{formatCurrency(p.revenue)}</td>
                    <td className="py-3.5 px-4 text-center">
                      {p.stockQuantity === 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20">
                          <TrendingDown className="w-3 h-3" /> {t("stock.out")}
                        </span>
                      ) : p.stockQuantity <= 10 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20">
                          <Minus className="w-3 h-3" /> {t("stock.low")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20">
                          <TrendingUp className="w-3 h-3" /> {t("stock.inStock")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredInventory.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-12 text-[#64748B]">{t("common.noData")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
}
