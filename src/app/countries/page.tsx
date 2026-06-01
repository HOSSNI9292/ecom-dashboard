"use client";

import { useMemo } from "react";
import { Globe, DollarSign, ShoppingCart, CheckCircle, TrendingUp } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { CountryBarChart } from "@/components/charts/CountryBarChart";
import { PageWrapper } from "@/components/PageWrapper";
import { useCountries } from "@/hooks";
import { formatCurrency, formatNumber, formatPercentage } from "@/utils";
import type { CountryStats } from "@/types";
import { COUNTRY_COLORS } from "@/utils";

export default function CountriesPage() {
  const { data, loading, error, refetch } = useCountries({ refreshInterval: 30000 });

  const bestCountry = useMemo(() => {
    if (!data || data.length === 0) return null;
    return [...data].sort((a, b) => b.revenue - a.revenue)[0];
  }, [data]);

  const totalRevenue = data?.reduce((s, c) => s + c.revenue, 0) ?? 0;
  const totalOrders = data?.reduce((s, c) => s + c.orders, 0) ?? 0;
  const avgConfirmation = data && data.length > 0
    ? data.reduce((s, c) => s + c.confirmationRate, 0) / data.length
    : 0;

  return (
    <PageWrapper loading={loading && !data} error={error} onRetry={refetch}>
      <div className="space-y-6">
        {bestCountry && (
          <Card className="bg-gradient-to-r from-accent-600/20 to-dark-800 border-accent-500/30">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-accent-500/20 rounded-xl">
                <Globe className="w-8 h-8 text-accent-400" />
              </div>
              <div>
                <p className="text-dark-300 text-sm">Best Performing Country</p>
                <p className="text-2xl font-bold text-white">{bestCountry.countryName}</p>
                <p className="text-dark-400 text-sm mt-1">
                  {formatCurrency(bestCountry.revenue)} revenue | {formatNumber(bestCountry.orders)} orders
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={<DollarSign className="w-5 h-5" />} color="accent" />
          <StatCard title="Total Orders" value={formatNumber(totalOrders)} icon={<ShoppingCart className="w-5 h-5" />} color="success" />
          <StatCard title="Avg Confirmation Rate" value={formatPercentage(avgConfirmation)} icon={<CheckCircle className="w-5 h-5" />} color="warning" />
          <StatCard title="Countries" value={formatNumber(data?.length ?? 0)} icon={<Globe className="w-5 h-5" />} color="info" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CountryBarChart data={data ?? []} loading={loading} dataKey="revenue" title="Revenue by Country" />
          <CountryBarChart data={data ?? []} loading={loading} dataKey="orders" title="Orders by Country" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CountryBarChart data={data ?? []} loading={loading} dataKey="confirmationRate" title="Confirmation Rate by Country" />
          <Card>
            <CardHeader>
              <CardTitle>Country Rankings</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700">
                    <th className="text-left text-dark-400 text-xs font-medium uppercase tracking-wider py-3 px-4">#</th>
                    <th className="text-left text-dark-400 text-xs font-medium uppercase tracking-wider py-3 px-4">Country</th>
                    <th className="text-right text-dark-400 text-xs font-medium uppercase tracking-wider py-3 px-4">Revenue</th>
                    <th className="text-right text-dark-400 text-xs font-medium uppercase tracking-wider py-3 px-4">Orders</th>
                    <th className="text-right text-dark-400 text-xs font-medium uppercase tracking-wider py-3 px-4">Confirmation</th>
                  </tr>
                </thead>
                <tbody>
                  {(data ?? []).sort((a, b) => b.revenue - a.revenue).map((country: CountryStats, idx: number) => (
                    <tr key={country.country} className="border-b border-dark-700/50 hover:bg-dark-800/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium" style={{ backgroundColor: `${COUNTRY_COLORS[idx % COUNTRY_COLORS.length]}20`, color: COUNTRY_COLORS[idx % COUNTRY_COLORS.length] }}>
                          {idx + 1}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {country.flag && <img src={country.flag} alt={country.countryName} className="w-5 h-4 rounded" />}
                          <span className="text-white font-medium">{country.countryName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-white font-medium">{formatCurrency(country.revenue)}</td>
                      <td className="py-3 px-4 text-right text-dark-200">{formatNumber(country.orders)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`text-sm font-medium ${country.confirmationRate >= 0.5 ? "text-success" : country.confirmationRate >= 0.2 ? "text-warning" : "text-error"}`}>
                          {formatPercentage(country.confirmationRate)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!data || data.length === 0) && (
                    <tr><td colSpan={5} className="text-center py-8 text-dark-400">No country data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
