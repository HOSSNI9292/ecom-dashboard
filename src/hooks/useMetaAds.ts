"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { MetaSummary } from "@/types/meta";
import { getCachedMetaData, setCachedMetaData, fetchMetaAds, getMetaCredentials } from "@/services/meta";

const SYNC_INTERVAL = 30 * 60 * 1000;

export function useMetaAds(datePreset?: string) {
  const [data, setData] = useState<MetaSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const hasDataRef = useRef(false);

  const hasCredentials = typeof window !== "undefined" && getMetaCredentials() !== null;

  const refresh = useCallback(async () => {
    if (!getMetaCredentials()) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const result = await fetchMetaAds(datePreset);
      setData(result);
      hasDataRef.current = true;
    } catch (err) {
      const cached = getCachedMetaData();
      if (cached && !hasDataRef.current) setData(cached);
      setError(err instanceof Error ? err.message : "Failed to sync Meta Ads");
    } finally {
      setLoading(false);
    }
  }, [datePreset]);

  useEffect(() => {
    if (!hasCredentials) {
      setLoading(false);
      return;
    }

    const cached = getCachedMetaData();
    if (cached) {
      setData(cached);
      setLoading(false);
    }

    refresh();

    intervalRef.current = setInterval(refresh, SYNC_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [hasCredentials, refresh]);

  return { data, loading, error, refresh, hasCredentials };
}
