import type { MetaCredentials, MetaAd, MetaSummary } from "@/types/meta";

const META_STORAGE_KEY = "cod_meta_credentials";
const META_DATA_KEY = "cod_meta_data";

export function getMetaCredentials(): MetaCredentials | null {
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveMetaCredentials(creds: MetaCredentials): void {
  localStorage.setItem(META_STORAGE_KEY, JSON.stringify(creds));
}

export function clearMetaCredentials(): void {
  localStorage.removeItem(META_STORAGE_KEY);
  localStorage.removeItem(META_DATA_KEY);
}

export function getCachedMetaData(): MetaSummary | null {
  try {
    const raw = localStorage.getItem(META_DATA_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.lastSynced && Date.now() - new Date(parsed.lastSynced).getTime() < 30 * 60 * 1000) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function setCachedMetaData(data: MetaSummary): void {
  localStorage.setItem(META_DATA_KEY, JSON.stringify(data));
}

export async function fetchMetaAds(): Promise<MetaSummary> {
  const creds = getMetaCredentials();
  if (!creds) throw new Error("Meta credentials not configured");

  const res = await fetch("/api/meta/ads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(creds),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  const data: MetaSummary = await res.json();
  setCachedMetaData(data);
  return data;
}
