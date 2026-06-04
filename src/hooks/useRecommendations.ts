"use client";

import { useState, useEffect, useCallback } from "react";
import type { Recommendation, RecommendationsData } from "@/types/meta";
import type { DashboardStats, CountryStats, Product } from "@/types/api";
import type { MetaSummary } from "@/types/meta";
import { generateRecommendations, getCachedRecommendations } from "@/services/recommendations";

export function useRecommendations(
  stats: DashboardStats | null,
  countries: CountryStats[],
  products: Product[],
  metaData: MetaSummary | null
) {
  const [data, setData] = useState<RecommendationsData | null>(null);
  const [loading, setLoading] = useState(true);

  const generate = useCallback(() => {
    if (!stats) {
      setLoading(false);
      return;
    }
    const cached = getCachedRecommendations();
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }
    const recs = generateRecommendations(stats, countries, products, metaData);
    const result: RecommendationsData = { recommendations: recs, generatedAt: new Date().toISOString() };
    setData(result);
    setLoading(false);
  }, [stats, countries, products, metaData]);

  useEffect(() => {
    generate();
  }, [generate]);

  const markRead = useCallback((id: string) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        recommendations: prev.recommendations.map((r) =>
          r.id === id ? { ...r, read: true } : r
        ),
      };
    });
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    setData(null);
    generate();
  }, [generate]);

  return { data, loading, refresh, markRead };
}
