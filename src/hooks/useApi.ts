"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { api } from "@/services";
import type {
  DashboardStats,
  Order,
  Product,
  CountryStats,
  RevenuePoint,
} from "@/types";

interface UseApiOptions {
  autoFetch?: boolean;
  refreshInterval?: number;
  onError?: (error: Error) => void;
}

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

function useApi<T>(
  fetcher: () => Promise<T>,
  options: UseApiOptions = {}
): UseApiResult<T> {
  const { autoFetch = true, refreshInterval = 0, onError } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const refetch = useCallback(async () => {
    api.refreshConfig();
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (mountedRef.current) setData(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (mountedRef.current) setError(error);
      onError?.(error);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [fetcher, onError]);

  useEffect(() => {
    mountedRef.current = true;
    if (autoFetch) refetch();
    return () => { mountedRef.current = false; };
  }, [autoFetch, refetch]);

  useEffect(() => {
    if (refreshInterval > 0 && autoFetch) {
      intervalRef.current = setInterval(refetch, refreshInterval);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refreshInterval, autoFetch, refetch]);

  return { data, loading, error, refetch };
}

export function useDashboardData(options?: UseApiOptions) {
  return useApi(() => api.fetchAllData(), {
    refreshInterval: 30000,
    ...options,
  });
}

export function useOrders(options?: UseApiOptions & {
  search?: string;
  status?: string;
  country?: string;
  page?: number;
  perPage?: number;
}) {
  const { search, status, country, page = 1, perPage = 20, ...apiOpts } = options || {};
  const result = useApi(() => api.fetchAllData(), { refreshInterval: 30000, ...apiOpts });

  const filtered = useMemo(() => {
    if (!result.data?.orders) return { orders: [], totalPages: 0 };
    let list = [...result.data.orders];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.customerName.toLowerCase().includes(s) ||
          o.phone.includes(s) ||
          o.orderId.toLowerCase().includes(s) ||
          o.productName.toLowerCase().includes(s)
      );
    }
    if (status) list = list.filter((o) => o.status === status);
    if (country) list = list.filter((o) => o.country === country);
    const total = list.length;
    const totalPages = Math.ceil(total / perPage);
    const start = (page - 1) * perPage;
    list = list.slice(start, start + perPage);
    return { orders: list, totalPages };
  }, [result.data?.orders, search, status, country, page, perPage]);

  return { ...result, data: filtered, rawData: result.data };
}

export function useProducts(options?: UseApiOptions & {
  search?: string;
  country?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  perPage?: number;
}) {
  const { search, country, sortBy = "revenue", sortOrder = "desc", page = 1, perPage = 20, ...apiOpts } = options || {};
  const result = useApi(() => api.fetchAllData(), { refreshInterval: 30000, ...apiOpts });

  const processed = useMemo(() => {
    if (!result.data?.products) return { products: [], totalPages: 0 };
    const aggregated = new Map<string, Product>();
    for (const p of result.data.products) {
      const key = p.id;
      if (aggregated.has(key)) {
        const existing = aggregated.get(key)!;
        existing.totalSold += p.totalSold;
        existing.revenue += p.revenue;
        existing.stockQuantity = Math.max(existing.stockQuantity, p.stockQuantity);
      } else {
        aggregated.set(key, { ...p });
      }
    }
    let list = Array.from(aggregated.values());
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(s) || p.code.toLowerCase().includes(s));
    }
    if (country) list = list.filter((p) => p.country === country);
    list.sort((a, b) => {
      const mul = sortOrder === "desc" ? -1 : 1;
      if (sortBy === "revenue") return (a.revenue - b.revenue) * mul;
      if (sortBy === "sold") return (a.totalSold - b.totalSold) * mul;
      if (sortBy === "stock") return (a.stockQuantity - b.stockQuantity) * mul;
      if (sortBy === "price") return (a.price - b.price) * mul;
      return (a.revenue - b.revenue) * mul;
    });
    const total = list.length;
    const totalPages = Math.ceil(total / perPage);
    const start = (page - 1) * perPage;
    list = list.slice(start, start + perPage);
    return { products: list, totalPages };
  }, [result.data?.products, search, country, sortBy, sortOrder, page, perPage]);

  return { ...result, data: processed, rawData: result.data };
}

export function useCountries(options?: UseApiOptions) {
  const result = useApi(() => api.fetchAllData(), { refreshInterval: 30000, ...options });
  return { ...result, data: result.data?.countries ?? null };
}

export function useDashboardStats(options?: UseApiOptions) {
  const result = useApi(() => api.fetchAllData(), { refreshInterval: 30000, ...options });
  return { ...result, data: result.data?.stats ?? null };
}

export function useRevenueTrend(options?: UseApiOptions) {
  const result = useApi(() => api.fetchAllData(), { refreshInterval: 30000, ...options });
  return { ...result, data: result.data?.revenueTrend ?? null };
}

export function useLowStockProducts(options?: UseApiOptions) {
  const result = useApi(() => api.fetchAllData(), { refreshInterval: 30000, ...options });
  const low = useMemo(() => {
    if (!result.data?.products) return [];
    const aggregated = new Map<string, Product>();
    for (const p of result.data.products) {
      const key = p.id;
      if (aggregated.has(key)) {
        const existing = aggregated.get(key)!;
        existing.totalSold += p.totalSold;
        existing.stockQuantity = Math.max(existing.stockQuantity, p.stockQuantity);
      } else {
        aggregated.set(key, { ...p });
      }
    }
    return Array.from(aggregated.values())
      .filter((p) => p.stockQuantity > 0 && p.stockQuantity <= 10)
      .sort((a, b) => a.stockQuantity - b.stockQuantity);
  }, [result.data?.products]);
  return { ...result, data: low };
}

export function useOutOfStockProducts(options?: UseApiOptions) {
  const result = useApi(() => api.fetchAllData(), { refreshInterval: 30000, ...options });
  const out = useMemo(() => {
    if (!result.data?.products) return [];
    const aggregated = new Map<string, Product>();
    for (const p of result.data.products) {
      const key = p.id;
      if (aggregated.has(key)) {
        const existing = aggregated.get(key)!;
        existing.stockQuantity = Math.max(existing.stockQuantity, p.stockQuantity);
      } else {
        aggregated.set(key, { ...p });
      }
    }
    return Array.from(aggregated.values())
      .filter((p) => p.stockQuantity === 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [result.data?.products]);
  return { ...result, data: out };
}

export { useApi };
