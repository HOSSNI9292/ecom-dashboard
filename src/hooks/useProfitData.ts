"use client";

import { useMemo } from "react";
import { useDashboardData } from "./useApi";
import { useMetaAds } from "./useMetaAds";
import { useProductCosts, getCostForProduct } from "./useProductCosts";
import { filterOrdersByDate, toParisDate, isDateInFilter } from "@/utils";
import { getFeeForCountry, computeServiceFees } from "@/utils/fees";
import { XOF_TO_USD_RATE } from "@/utils/constants";
import type { DateFilterValue } from "@/utils/dates";
import type { DatePreset } from "@/types/meta";

export interface ProfitData {
  revenue: number;
  adSpend: number;
  productCostTotal: number;
  shippingTotal: number;
  codFeeTotal: number;
  upsellTotal: number;
  serviceFeeTotal: number;
  netProfit: number;
  profitMargin: number;
  roas: number;
  cpa: number;
  totalPurchases: number;
  configuredProducts: number;
  productProfitability: { name: string; code: string; revenue: number; orders: number; profit: number; margin: number; image?: string; quantity: number }[];
  countryProfitability: { country: string; countryName: string; flag: string; revenue: number; profit: number; margin: number; orders: number }[];
  profitTrend: { date: string; revenue: number; profit: number; productCost: number; shipping: number; codFees: number }[];
  hasRealCosts: boolean;
  unconfiguredOrders: number;
  __debug?: {
    totalOrdersFetched: number;
    totalDelivered: number;
    totalConfirmed: number;
    uniqueProducts: number;
    uniqueCountries: number;
    first10Products: { name: string; code: string }[];
    first10Countries: string[];
    sampleOrderRaw: string;
    dateFilterLabel: string;
  };
}

export function useProfitData(dateFilter: DateFilterValue, metaDatePreset: DatePreset) {
  const { data: codData, loading: codLoading, error: codError, refetch } = useDashboardData();
  const { data: metaData, loading: metaLoading, error: metaError, refresh: refreshMeta, hasCredentials } = useMetaAds(metaDatePreset);
  const { costs } = useProductCosts();

  const profitData = useMemo((): ProfitData | null => {
    if (!codData) return null;

    const orders = codData.orders ?? [];
    const allProducts = codData.products ?? [];
    const filteredOrders = filterOrdersByDate(orders, dateFilter);

    const confirmedOrders = dateFilter === "all"
      ? orders.filter((o) => o.confirmedAt)
      : orders.filter((o) => isDateInFilter(o.confirmedAt, dateFilter));

    const revenue = confirmedOrders.reduce((s, o) => s + o.amount, 0);
    const totalQuantity = confirmedOrders.reduce((s, o) => s + o.quantity, 0);
    const adSpend = metaData?.totalSpend ?? 0;
    const totalPurchases = metaData?.totalPurchases ?? 0;

    const dailyMap = new Map<string, { revenue: number; orders: number; costs: { product: number; shipping: number; codFee: number }[] }>();
    let productCostTotal = 0;
    let shippingTotal = 0;
    let codFeeTotal = 0;
    let upsellTotal = 0;
    let unconfiguredOrders = 0;

    const perOrderProfits: {
      key: string;
      name: string;
      code: string;
      image?: string;
      revenue: number;
      quantity: number;
      productCost: number;
      shipping: number;
      codFee: number;
      profit: number;
      country: string;
    }[] = [];

    for (const o of confirmedOrders) {
      const prodKey = o.productCode || o.productName;
      const settings = getCostForProduct(prodKey);

      const qty = o.quantity || 1;
      const pc = settings ? settings.costOfGoods * qty : 0;
      const sc = settings ? settings.shippingCost * qty : 0;
      const cf = settings ? settings.codFee * qty : 0;
      const uc = settings ? (settings.upsellCost || 0) * qty : 0;

      productCostTotal += pc;
      shippingTotal += sc;
      codFeeTotal += cf;
      upsellTotal += uc;
      if (!settings) unconfiguredOrders += 1;

      const day = toParisDate(o.date) || "unknown";
      if (!dailyMap.has(day)) dailyMap.set(day, { revenue: 0, orders: 0, costs: [] });
      const entry = dailyMap.get(day)!;
      entry.revenue += o.amount;
      entry.orders += 1;
      entry.costs.push({ product: pc, shipping: sc, codFee: cf });

      const fromAll = allProducts.find((p) => (o.productCode && p.code === o.productCode) || p.name === o.productName);
      const profit = o.amount - pc - sc - cf;

      perOrderProfits.push({
        key: prodKey,
        name: o.productName,
        code: prodKey,
        image: fromAll?.image || o.productImage,
        revenue: o.amount,
        quantity: qty,
        productCost: pc,
        shipping: sc,
        codFee: cf,
        profit,
        country: o.country || "XX",
      });
    }

    const countryOrderCount = new Map<string, number>();
    for (const o of confirmedOrders) {
      const c = o.country || "XX";
      countryOrderCount.set(c, (countryOrderCount.get(c) || 0) + 1);
    }
    let serviceFeeTotal = 0;
    for (const [country, count] of countryOrderCount) {
      const feePerOrder = getFeeForCountry(country);
      serviceFeeTotal += computeServiceFees(count, feePerOrder);
    }

    const revenueInUsd = revenue / XOF_TO_USD_RATE;
    const totalCostsInUsd = (productCostTotal + shippingTotal + codFeeTotal + upsellTotal + serviceFeeTotal) / XOF_TO_USD_RATE;
    const netProfit = revenueInUsd - adSpend - totalCostsInUsd;
    const profitMargin = revenueInUsd > 0 ? (netProfit / revenueInUsd) * 100 : 0;
    const roas = adSpend > 0 ? revenueInUsd / adSpend : 0;
    const cpa = totalPurchases > 0 ? adSpend / totalPurchases : 0;

    const productMap = new Map<string, { name: string; code: string; revenue: number; orders: number; profit: number; quantity: number; image?: string }>();
    for (const p of perOrderProfits) {
      if (!productMap.has(p.key)) {
        productMap.set(p.key, { name: p.name, code: p.code, revenue: 0, orders: 0, profit: 0, quantity: 0, image: p.image });
      }
      const entry = productMap.get(p.key)!;
      entry.revenue += p.revenue;
      entry.orders += 1;
      entry.profit += p.profit;
      entry.quantity += p.quantity;
      if (p.image && !entry.image) entry.image = p.image;
    }

    const productProfitability = Array.from(productMap.values())
      .map((p) => ({
        name: p.name,
        code: p.code,
        revenue: p.revenue,
        orders: p.orders,
        profit: p.profit,
        margin: p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0,
        image: p.image,
        quantity: p.quantity,
      }))
      .sort((a, b) => b.profit - a.profit);

    const countryMap = new Map<string, { revenue: number; profit: number; orders: number }>();
    for (const o of confirmedOrders) {
      const c = o.country || "XX";
      const prodKey = o.productCode || o.productName;
      const settings = getCostForProduct(prodKey);
      const qty = o.quantity || 1;
      const pc = settings ? settings.costOfGoods * qty : 0;
      const sc = settings ? settings.shippingCost * qty : 0;
      const cf = settings ? settings.codFee * qty : 0;

      if (!countryMap.has(c)) countryMap.set(c, { revenue: 0, profit: 0, orders: 0 });
      const entry = countryMap.get(c)!;
      entry.revenue += o.amount;
      entry.orders += 1;
      entry.profit += o.amount - pc - sc - cf;
    }

    const countryProfitability = Array.from(countryMap.entries())
      .map(([code, d]) => {
        const fromCod = codData.countries.find((ct) => ct.country === code);
        return {
          country: code,
          countryName: fromCod?.countryName || code,
          flag: fromCod?.flag || "",
          revenue: d.revenue,
          profit: d.profit,
          margin: d.revenue > 0 ? (d.profit / d.revenue) * 100 : 0,
          orders: d.orders,
        };
      })
      .sort((a, b) => b.profit - a.profit);

    const dailyAdSpend = adSpend / Math.max(dailyMap.size, 1);
    const profitTrend = Array.from(dailyMap.entries())
      .map(([date, d]) => {
        const dayProductCost = d.costs.reduce((s, c) => s + c.product, 0);
        const dayShipping = d.costs.reduce((s, c) => s + c.shipping, 0);
        const dayCodFees = d.costs.reduce((s, c) => s + c.codFee, 0);
        const dayCostsInUsd = (dayProductCost + dayShipping + dayCodFees) / XOF_TO_USD_RATE;
        const dayRevenueInUsd = d.revenue / XOF_TO_USD_RATE;
        const dayProfit = dayRevenueInUsd - dailyAdSpend - dayCostsInUsd;
        return {
          date,
          revenue: d.revenue,
          profit: dayProfit,
          productCost: dayProductCost,
          shipping: dayShipping,
          codFees: dayCodFees,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    const uniqueProductsList = Array.from(new Set(filteredOrders.map((o) => o.productName).filter(Boolean)));
    const uniqueCountriesList = Array.from(new Set(filteredOrders.map((o) => o.country).filter(Boolean)));

    const result = {
      revenue,
      adSpend,
      productCostTotal,
      shippingTotal,
      codFeeTotal,
      upsellTotal,
      serviceFeeTotal,
      netProfit,
      profitMargin,
      roas,
      cpa,
      totalPurchases,
      configuredProducts: costs.length,
      productProfitability,
      countryProfitability,
      profitTrend,
      hasRealCosts: costs.length > 0,
      unconfiguredOrders,
    } as ProfitData;

    if (process.env.NODE_ENV !== "production") {
      result.__debug = {
        totalOrdersFetched: filteredOrders.length,
        totalDelivered: filteredOrders.filter((o) => o.status === "delivered").length,
        totalConfirmed: filteredOrders.filter((o) => o.status === "confirmed").length,
        uniqueProducts: uniqueProductsList.length,
        uniqueCountries: uniqueCountriesList.length,
        first10Products: uniqueProductsList.slice(0, 10).map((name) => {
          const o = filteredOrders.find((x) => x.productName === name);
          return { name, code: o?.productCode || "" };
        }),
        first10Countries: uniqueCountriesList.slice(0, 10),
        sampleOrderRaw: JSON.stringify(filteredOrders[0] || null, null, 2),
        dateFilterLabel: dateFilter,
      };
    }

    return result;
  }, [codData, metaData, dateFilter, costs]);

  const normalizedError: Error | null = useMemo(() => {
    if (codError) return codError instanceof Error ? codError : new Error(String(codError));
    if (metaError) return new Error(metaError);
    return null;
  }, [codError, metaError]);

  return {
    profitData,
    loading: codLoading || metaLoading,
    error: normalizedError,
    refetch: () => { refetch(); refreshMeta(); },
    hasMetaCredentials: hasCredentials,
    configuredCosts: costs.length,
  };
}
