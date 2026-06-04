"use client";

import { useState, useCallback, useMemo } from "react";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { DataTable } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { PageWrapper } from "@/components/PageWrapper";
import { DateFilter } from "@/components/DateFilter";
import { useProducts, useDashboardData } from "@/hooks";
import { formatCurrency, formatNumber, getImageUrlOrFallback, filterOrdersByDate } from "@/utils";
import { exportToCSV } from "@/utils/csv";
import type { Product, Order } from "@/types";
import type { DateFilterValue } from "@/utils/dates";
import { useTranslation } from "react-i18next";
import { TrendingUp, TrendingDown, Minus, Download, Star, ImageIcon } from "lucide-react";

export default function ProductsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("revenue");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("all");

  const { data, loading, error, refetch, rawData } = useProducts({
    search: search || undefined,
    sortBy,
    sortOrder,
    page,
    perPage: 20,
  });

  const ordersData = useDashboardData();
  const allOrders = ordersData.data?.orders ?? [];

  const filteredOrders = useMemo(() => filterOrdersByDate(allOrders, dateFilter), [allOrders, dateFilter]);

  const aggregated = useMemo(() => {
    if (dateFilter !== "all") {
      const map = new Map<string, Product>();
      for (const o of filteredOrders as Order[]) {
        const key = o.productCode || o.productName;
        if (!key) continue;
        if (map.has(key)) {
          const ex = map.get(key)!;
          ex.totalSold += o.quantity;
          ex.revenue += o.amount;
        } else {
          const existingProduct = rawData?.products?.find((p: Product) => p.code === key || p.name === key);
          map.set(key, {
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
            image: o.productImage || existingProduct?.image || "",
          });
        }
      }
      return Array.from(map.values());
    }

    if (!rawData?.products) return [];
    const map = new Map<string, Product>();
    for (const p of rawData.products) {
      const key = p.id;
      if (map.has(key)) {
        const ex = map.get(key)!;
        ex.totalSold += p.totalSold;
        ex.revenue += p.revenue;
        ex.stockQuantity = Math.max(ex.stockQuantity, p.stockQuantity);
        if (!ex.image && p.image) ex.image = p.image;
      } else {
        map.set(key, { ...p });
      }
    }
    return Array.from(map.values());
  }, [rawData?.products, filteredOrders, dateFilter]);

  const handleSearch = useCallback((val: string) => { setSearch(val); setPage(1); }, []);

  const handleExport = useCallback(() => {
    exportToCSV(
      aggregated.map((p) => ({
        name: p.name,
        code: p.code,
        stock: p.stockQuantity,
        sold: p.totalSold,
        revenue: p.revenue,
        price: p.price,
        country: p.countryName || p.country,
      })),
      "products_export",
      { name: "Product", code: "Code", stock: "Stock", sold: "Sold", revenue: "Revenue (XOF)", price: "Unit Price (XOF)", country: "Country" }
    );
  }, [aggregated]);

  const maxRevenue = useMemo(() => Math.max(...aggregated.map((p) => p.revenue), 1), [aggregated]);
  const maxSold = useMemo(() => Math.max(...aggregated.map((p) => p.totalSold), 1), [aggregated]);

  const columns = [
    {
      key: "name",
      header: "Product",
      render: (p: Product) => {
        const perfScore = (p.revenue / maxRevenue) * 0.6 + (p.totalSold / maxSold) * 0.4;
        const isTop = perfScore > 0.5;
        return (
            <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#1F2937] flex items-center justify-center shrink-0 overflow-hidden">
              {p.image ? (
                <img 
                  src={getImageUrlOrFallback(p.image)} 
                  alt={p.name} 
                  className="w-full h-full object-cover" 
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <ImageIcon className="w-5 h-5 text-[#64748B]" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white font-medium text-sm truncate">{p.name}</p>
                {isTop && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20">
                    <Star className="w-2.5 h-2.5" /> {t("products.top")}
                  </span>
                )}
              </div>
              <p className="text-[#64748B] text-xs">{p.code}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: "stockQuantity",
      header: "Stock",
      render: (p: Product) => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 rounded-full bg-[#1F2937] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                p.stockQuantity === 0 ? "bg-[#ef4444]" : p.stockQuantity <= 10 ? "bg-[#f59e0b]" : "bg-[#10b981]"
              }`}
              style={{ width: `${Math.min((p.stockQuantity / 50) * 100, 100)}%` }}
            />
          </div>
          <span className={`text-sm font-medium ${
            p.stockQuantity === 0 ? "text-[#ef4444]" : p.stockQuantity <= 10 ? "text-[#f59e0b]" : "text-white"
          }`}>
            {formatNumber(p.stockQuantity)}
          </span>
        </div>
      ),
    },
    {
      key: "totalSold",
      header: "Sold",
      render: (p: Product) => <span className="text-white font-medium">{formatNumber(p.totalSold)}</span>,
    },
    {
      key: "revenue",
      header: "Revenue",
      render: (p: Product) => {
        const share = p.revenue / maxRevenue;
        return (
          <div>
            <span className="text-white font-semibold">{formatCurrency(p.revenue)}</span>
            <div className="w-20 h-1 rounded-full bg-[#1F2937] mt-1 overflow-hidden">
              <div className="h-full rounded-full bg-[#6366F1]" style={{ width: `${share * 100}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      key: "price",
      header: "Price",
      render: (p: Product) => <span className="text-[#94A3B8]">{formatCurrency(p.price)}</span>,
    },
    {
      key: "countryName",
      header: "Country",
      render: (p: Product) => <span className="text-[#64748B]">{p.countryName || p.country}</span>,
    },
    {
      key: "performance",
      header: "Performance",
      render: (p: Product) => {
        const score = (p.revenue / maxRevenue) * 0.6 + (p.totalSold / maxSold) * 0.4;
        if (score > 0.6) return (
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-[#10b981]" />
                    <span className="text-xs font-semibold text-[#10b981]">{t("products.excellent")}</span>
          </div>
        );
        if (score > 0.3) return (
          <div className="flex items-center gap-1.5">
            <Minus className="w-4 h-4 text-[#f59e0b]" />
            <span className="text-xs font-semibold text-[#f59e0b]">{t("products.average")}</span>
          </div>
        );
        return (
          <div className="flex items-center gap-1.5">
            <TrendingDown className="w-4 h-4 text-[#ef4444]" />
            <span className="text-xs font-semibold text-[#ef4444]">{t("products.low")}</span>
          </div>
        );
      },
    },
  ];

  return (
    <PageWrapper loading={loading && !rawData?.products?.length} error={error} onRetry={refetch} hasData={!!rawData?.products?.length}>
      <div className="space-y-4">
        <DateFilter value={dateFilter} onChange={setDateFilter} />
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchInput value={search} onChange={handleSearch} placeholder={t("common.search")} />
          </div>
          <Select
            value={`${sortBy}-${sortOrder}`}
            onChange={(v) => { const [sb, so] = v.split("-") as [string, "asc" | "desc"]; setSortBy(sb); setSortOrder(so); }}
            options={[
              { label: `${t("dashboard.revenue")} (${t("products.high")})`, value: "revenue-desc" },
              { label: `${t("dashboard.revenue")} (${t("products.low")})`, value: "revenue-asc" },
              { label: `${t("dashboard.sold")} (${t("products.high")})`, value: "sold-desc" },
              { label: `${t("dashboard.sold")} (${t("products.low")})`, value: "sold-asc" },
              { label: `${t("products.stock")} (${t("products.low")})`, value: "stock-asc" },
              { label: `${t("products.stock")} (${t("products.high")})`, value: "stock-desc" },
              { label: `${t("products.price")} (${t("products.high")})`, value: "price-desc" },
              { label: `${t("products.price")} (${t("products.low")})`, value: "price-asc" },
            ]}
            className="w-full sm:w-44"
          />
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#111827] border border-[#1F2937] hover:border-[#6366F1]/30 text-white rounded-lg transition-all duration-200 text-sm hover:bg-[#1E293B]"
          >
            <Download className="w-4 h-4" /> {t("common.export")} CSV
          </button>
        </div>

        <div className="bg-[#111827] border border-[#1F2937] rounded-xl overflow-hidden">
          <DataTable columns={columns} data={data?.products ?? []} keyExtractor={(p: Product) => p.id} loading={loading} emptyMessage={t("common.noData")} />
        </div>

        {data?.totalPages > 1 && (
          <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
        )}
      </div>
    </PageWrapper>
  );
}
