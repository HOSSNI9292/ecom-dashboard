"use client";

import { useState, useCallback } from "react";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { DataTable } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { PageWrapper } from "@/components/PageWrapper";
import { useProducts } from "@/hooks";
import { formatCurrency, formatNumber } from "@/utils";
import type { Product } from "@/types";
import { Package, TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("revenue");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { data, loading, error, refetch } = useProducts({
    search: search || undefined,
    sortBy,
    sortOrder,
    page,
    perPage: 20,
  });

  const handleSearch = useCallback((val: string) => { setSearch(val); setPage(1); }, []);

  const columns = [
    {
      key: "name",
      header: "Product",
      render: (p: Product) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent-500/10 rounded-lg">
            <Package className="w-4 h-4 text-accent-400" />
          </div>
          <div>
            <p className="text-white font-medium">{p.name}</p>
            <p className="text-dark-400 text-xs">{p.code}</p>
          </div>
        </div>
      ),
    },
    {
      key: "stockQuantity",
      header: "Stock",
      render: (p: Product) => (
        <span className={`font-medium ${p.stockQuantity === 0 ? "text-error" : p.stockQuantity <= 10 ? "text-warning" : "text-white"}`}>
          {formatNumber(p.stockQuantity)}
        </span>
      ),
    },
    {
      key: "totalSold",
      header: "Sold",
      render: (p: Product) => <span className="text-white">{formatNumber(p.totalSold)}</span>,
    },
    {
      key: "revenue",
      header: "Revenue",
      render: (p: Product) => <span className="text-white font-medium">{formatCurrency(p.revenue)}</span>,
    },
    {
      key: "countryName",
      header: "Country",
      render: (p: Product) => <span className="text-dark-300">{p.countryName || p.country}</span>,
    },
    {
      key: "price",
      header: "Unit Price",
      render: (p: Product) => <span className="text-dark-200">{formatCurrency(p.price)}</span>,
    },
    {
      key: "performance",
      header: "Performance",
      render: (p: Product) => {
        const avgPrice = p.revenue / (p.totalSold || 1);
        const perf = avgPrice > 5000 ? "high" : avgPrice > 2000 ? "medium" : "low";
        return (
          <div className="flex items-center gap-1.5">
            {perf === "high" ? <TrendingUp className="w-4 h-4 text-success" /> : perf === "medium" ? <Minus className="w-4 h-4 text-warning" /> : <TrendingDown className="w-4 h-4 text-error" />}
            <span className={`text-xs font-medium ${perf === "high" ? "text-success" : perf === "medium" ? "text-warning" : "text-error"}`}>
              {perf === "high" ? "Top" : perf === "medium" ? "Average" : "Low"}
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <PageWrapper loading={loading && !data} error={error} onRetry={refetch}>
      <div className="space-y-4">
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
              { label: "Stock (High)", value: "stock-desc" },
              { label: "Stock (Low)", value: "stock-asc" },
              { label: "Price (High)", value: "price-desc" },
              { label: "Price (Low)", value: "price-asc" },
            ]}
            className="w-full sm:w-48"
          />
        </div>

        <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
          <DataTable columns={columns} data={data?.products ?? []} keyExtractor={(p: Product) => p.id} loading={loading} emptyMessage="No products found" />
        </div>

        {data?.totalPages && data.totalPages > 1 && (
          <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
        )}
      </div>
    </PageWrapper>
  );
}
