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
import { TrendingUp, TrendingDown, Minus, Download, Star, ImageIcon, Package } from "lucide-react";

export default function ProductsPage() {
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
            <div className="w-12 h-12 rounded-xl bg-[#27272A] flex items-center justify-center shrink-0 overflow-hidden border border-[#27272A]">
              {p.image ? (
                <img 
                  src={getImageUrlOrFallback(p.image)} 
                  alt={p.name} 
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" 
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <ImageIcon className="w-5 h-5 text-[#3F3F46]" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[#FAFAFA] font-medium text-sm truncate">{p.name}</p>
                {isTop && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[10px] font-semibold bg-gradient-to-r from-[#F59E0B]/10 to-[#F59E0B]/5 text-[#F59E0B] border border-[#F59E0B]/20">
                    <Star className="w-2.5 h-2.5" /> Top
                  </span>
                )}
              </div>
              <p className="text-[#71717A] text-xs">{p.code}</p>
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
          <div className="w-16 h-1.5 rounded-full bg-[#27272A] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                p.stockQuantity === 0 ? "bg-[#EF4444]" : p.stockQuantity <= 10 ? "bg-[#F59E0B]" : "bg-[#10B981]"
              }`}
              style={{ width: `${Math.min((p.stockQuantity / 50) * 100, 100)}%` }}
            />
          </div>
          <span className={`text-sm font-medium ${
            p.stockQuantity === 0 ? "text-[#EF4444]" : p.stockQuantity <= 10 ? "text-[#F59E0B]" : "text-[#FAFAFA]"
          }`}>
            {formatNumber(p.stockQuantity)}
          </span>
        </div>
      ),
    },
    {
      key: "totalSold",
      header: "Sold",
      render: (p: Product) => <span className="text-[#FAFAFA] font-medium">{formatNumber(p.totalSold)}</span>,
    },
    {
      key: "revenue",
      header: "Revenue",
      render: (p: Product) => {
        const share = p.revenue / maxRevenue;
        return (
          <div>
            <span className="text-[#FAFAFA] font-semibold">{formatCurrency(p.revenue)}</span>
            <div className="w-20 h-1 rounded-full bg-[#27272A] mt-1 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#10B981] to-[#0EA5E9]" style={{ width: `${share * 100}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      key: "price",
      header: "Price",
      render: (p: Product) => <span className="text-[#A1A1AA]">{formatCurrency(p.price)}</span>,
    },
    {
      key: "countryName",
      header: "Country",
      render: (p: Product) => <span className="text-[#71717A]">{p.countryName || p.country}</span>,
    },
    {
      key: "performance",
      header: "Performance",
      render: (p: Product) => {
        const score = (p.revenue / maxRevenue) * 0.6 + (p.totalSold / maxSold) * 0.4;
        if (score > 0.6) return (
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-[#10B981]" />
            <span className="text-xs font-semibold text-[#10B981]">Excellent</span>
          </div>
        );
        if (score > 0.3) return (
          <div className="flex items-center gap-1.5">
            <Minus className="w-4 h-4 text-[#F59E0B]" />
            <span className="text-xs font-semibold text-[#F59E0B]">Average</span>
          </div>
        );
        return (
          <div className="flex items-center gap-1.5">
            <TrendingDown className="w-4 h-4 text-[#EF4444]" />
            <span className="text-xs font-semibold text-[#EF4444]">Low</span>
          </div>
        );
      },
    },
  ];

  return (
    <PageWrapper loading={loading && !rawData?.products?.length} error={error} onRetry={refetch} hasData={!!rawData?.products?.length}>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-start">
          <DateFilter value={dateFilter} onChange={setDateFilter} />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchInput value={search} onChange={handleSearch} placeholder="Search products..." />
          </div>
          <Select
            value={`${sortBy}-${sortOrder}`}
            onChange={(v) => { const [sb, so] = v.split("-") as [string, "asc" | "desc"]; setSortBy(sb); setSortOrder(so); }}
            options={[
              { label: "Revenue (High)", value: "revenue-desc" },
              { label: "Revenue (Low)", value: "revenue-asc" },
              { label: "Sold (High)", value: "sold-desc" },
              { label: "Sold (Low)", value: "sold-asc" },
              { label: "Stock (Low)", value: "stock-asc" },
              { label: "Stock (High)", value: "stock-desc" },
              { label: "Price (High)", value: "price-desc" },
              { label: "Price (Low)", value: "price-asc" },
            ]}
            className="w-full sm:w-44"
          />
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#141417] border border-[#27272A] hover:border-[#10B981]/30 text-[#FAFAFA] rounded-xl transition-all duration-200 text-sm hover:bg-[#1C1C21]"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        <div className="bg-[#141417] border border-[#27272A] rounded-2xl overflow-hidden">
          <DataTable columns={columns} data={data?.products ?? []} keyExtractor={(p: Product) => p.id} loading={loading} emptyMessage="No products" />
        </div>

        {data?.totalPages > 1 && (
          <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
        )}
      </div>
    </PageWrapper>
  );
}
