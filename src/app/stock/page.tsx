"use client";

import { Warehouse, AlertTriangle, Package, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { PageWrapper } from "@/components/PageWrapper";
import { useLowStockProducts, useOutOfStockProducts, useDashboardData } from "@/hooks";
import { formatNumber, formatCurrency } from "@/utils";
import type { Product } from "@/types";

export default function StockPage() {
  const allData = useDashboardData({ refreshInterval: 30000 });
  const lowStock = useLowStockProducts({ refreshInterval: 30000 });
  const outOfStock = useOutOfStockProducts({ refreshInterval: 30000 });

  const stats = allData.data?.stats;
  const allProducts = allData.data?.products ?? [];
  const uniqueProducts = new Map<string, Product>();
  for (const p of allProducts) {
    if (!uniqueProducts.has(p.id)) uniqueProducts.set(p.id, p);
    else {
      const ex = uniqueProducts.get(p.id)!;
      ex.totalSold += p.totalSold;
      ex.revenue += p.revenue;
    }
  }
  const uniqueProductList = Array.from(uniqueProducts.values());
  const inStock = uniqueProductList.filter((p) => p.stockQuantity > 10).length;
  const loading = allData.loading && !allData.data;
  const error = allData.error;

  return (
    <PageWrapper loading={loading} error={error} onRetry={allData.refetch}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Products" value={formatNumber(uniqueProductList.length)} icon={<Package className="w-5 h-5" />} color="accent" />
          <StatCard title="In Stock" value={formatNumber(inStock)} icon={<Warehouse className="w-5 h-5" />} color="success" />
          <StatCard title="Low Stock" value={formatNumber(lowStock.data?.length ?? 0)} icon={<AlertTriangle className="w-5 h-5" />} color="warning" subtitle="10 or less remaining" />
          <StatCard title="Out of Stock" value={formatNumber(outOfStock.data?.length ?? 0)} icon={<AlertTriangle className="w-5 h-5" />} color="error" subtitle="Need restock" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Low Stock Products</CardTitle>
            </CardHeader>
            {lowStock.loading && !lowStock.data ? (
              <div className="py-8 flex justify-center"><div className="w-6 h-6 border-2 border-dark-600 border-t-accent-500 rounded-full animate-spin" /></div>
            ) : (
              <div className="space-y-2">
                {(lowStock.data ?? []).slice(0, 20).map((p: Product) => (
                  <div key={p.id} className="flex items-center justify-between py-2 px-3 bg-warning/5 rounded-lg border border-warning/10">
                    <div>
                      <p className="text-white text-sm font-medium">{p.name}</p>
                      <p className="text-dark-400 text-xs">{p.code} - {p.countryName || p.country}</p>
                    </div>
                    <span className="text-warning font-bold">{formatNumber(p.stockQuantity)}</span>
                  </div>
                ))}
                {(!lowStock.data || lowStock.data.length === 0) && <p className="text-dark-400 text-sm text-center py-4">All products well stocked</p>}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Out of Stock Products</CardTitle>
            </CardHeader>
            {outOfStock.loading && !outOfStock.data ? (
              <div className="py-8 flex justify-center"><div className="w-6 h-6 border-2 border-dark-600 border-t-accent-500 rounded-full animate-spin" /></div>
            ) : (
              <div className="space-y-2">
                {(outOfStock.data ?? []).slice(0, 20).map((p: Product) => (
                  <div key={p.id} className="flex items-center justify-between py-2 px-3 bg-error/5 rounded-lg border border-error/10">
                    <div>
                      <p className="text-white text-sm font-medium">{p.name}</p>
                      <p className="text-dark-400 text-xs">{p.code} - {p.countryName || p.country}</p>
                    </div>
                    <span className="text-error font-bold">0</span>
                  </div>
                ))}
                {(!outOfStock.data || outOfStock.data.length === 0) && <p className="text-dark-400 text-sm text-center py-4">No out of stock products</p>}
              </div>
            )}
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Product Inventory</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left text-dark-400 text-xs font-medium uppercase tracking-wider py-3 px-4">Product</th>
                  <th className="text-right text-dark-400 text-xs font-medium uppercase tracking-wider py-3 px-4">Stock</th>
                  <th className="text-right text-dark-400 text-xs font-medium uppercase tracking-wider py-3 px-4">Sold</th>
                  <th className="text-right text-dark-400 text-xs font-medium uppercase tracking-wider py-3 px-4">Revenue</th>
                  <th className="text-center text-dark-400 text-xs font-medium uppercase tracking-wider py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {uniqueProductList.sort((a, b) => a.stockQuantity - b.stockQuantity).map((p: Product) => (
                  <tr key={p.id} className="border-b border-dark-700/50 hover:bg-dark-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="text-white text-sm font-medium">{p.name}</p>
                      <p className="text-dark-400 text-xs">{p.code}</p>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-medium ${p.stockQuantity === 0 ? "text-error" : p.stockQuantity <= 10 ? "text-warning" : "text-white"}`}>
                        {formatNumber(p.stockQuantity)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-dark-200">{formatNumber(p.totalSold)}</td>
                    <td className="py-3 px-4 text-right text-white font-medium">{formatCurrency(p.revenue)}</td>
                    <td className="py-3 px-4 text-center">
                      {p.stockQuantity === 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-error"><TrendingDown className="w-3 h-3" /> Out</span>
                      ) : p.stockQuantity <= 10 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-warning"><Minus className="w-3 h-3" /> Low</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-success"><TrendingUp className="w-3 h-3" /> In Stock</span>
                      )}
                    </td>
                  </tr>
                ))}
                {uniqueProductList.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-dark-400">No products</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
}
