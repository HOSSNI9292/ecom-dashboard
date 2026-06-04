import type { MetaCredentials, MetaSummary, MetaOAuthConfig, MetaAdAccount, MetaConnection } from "@/types/meta";

const CREDS_KEY = "cod_meta_credentials";
const DATA_KEY = "cod_meta_data";
const OAUTH_KEY = "cod_meta_oauth";
const CONN_KEY = "cod_meta_connection";
const APP_CONFIG_KEY = "cod_meta_app_config";
const STATE_KEY = "cod_meta_oauth_state";

export function getMetaCredentials(): MetaCredentials | null {
  try {
    const raw = localStorage.getItem(CREDS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveMetaCredentials(creds: MetaCredentials): void {
  localStorage.setItem(CREDS_KEY, JSON.stringify(creds));
}

export function clearMetaCredentials(): void {
  localStorage.removeItem(CREDS_KEY);
  localStorage.removeItem(DATA_KEY);
  localStorage.removeItem(CONN_KEY);
}

export function getMetaAppConfig(): MetaOAuthConfig {
  try {
    const raw = localStorage.getItem(APP_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { appId: "", appSecret: "" };
}

export function saveMetaAppConfig(config: MetaOAuthConfig): void {
  localStorage.setItem(APP_CONFIG_KEY, JSON.stringify(config));
}

export function getMetaConnection(): MetaConnection {
  try {
    const raw = localStorage.getItem(CONN_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { connected: false, adAccountId: null, adAccountName: null, accessToken: null, lastSyncTime: null, tokenExpiresAt: null };
}

export function saveMetaConnection(conn: MetaConnection): void {
  localStorage.setItem(CONN_KEY, JSON.stringify(conn));
}

function generateState(): string {
  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  localStorage.setItem(STATE_KEY, state);
  return state;
}

function verifyState(state: string): boolean {
  const saved = localStorage.getItem(STATE_KEY);
  localStorage.removeItem(STATE_KEY);
  return saved === state;
}

export function getOAuthUrl(redirectUri: string): string {
  const config = getMetaAppConfig();
  if (!config.appId) throw new Error("Meta App ID not configured");
  const state = generateState();
  const scopes = ["ads_read", "business_management"].join(",");
  return `https://www.facebook.com/v25.0/dialog/oauth?client_id=${config.appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}&response_type=code`;
}

export function getCachedMetaData(): MetaSummary | null {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.lastSynced && Date.now() - new Date(parsed.lastSynced).getTime() < 30 * 60 * 1000) {
      return parsed;
    }
    return null;
  } catch { return null; }
}

export function setCachedMetaData(data: MetaSummary): void {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

export async function fetchMetaAds(datePreset?: string): Promise<MetaSummary> {
  const creds = getMetaCredentials();
  if (!creds) throw new Error("Meta credentials not configured");

  const res = await fetch("/api/meta/ads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...creds, datePreset: datePreset || "last_30d" }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  const data: MetaSummary = await res.json();
  setCachedMetaData(data);

  const conn = getMetaConnection();
  conn.lastSyncTime = new Date().toISOString();
  saveMetaConnection(conn);

  return data;
}

export async function exchangeCodeForToken(code: string, redirectUri: string, appId?: string, appSecret?: string): Promise<{ accessToken: string; expiresAt: string }> {
  const config = appId && appSecret ? { appId, appSecret } : getMetaAppConfig();
  const url = `https://graph.facebook.com/v25.0/oauth/access_token?client_id=${config.appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${config.appSecret}&code=${code}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: "Token exchange failed" } }));
    throw new Error(err.error?.message || "Token exchange failed");
  }
  const data = await res.json();
  const expiresAt = new Date(Date.now() + (data.expires_in || 5184000) * 1000).toISOString();
  return { accessToken: data.access_token, expiresAt };
}

export async function exchangeShortLivedToken(token: string, appId?: string, appSecret?: string): Promise<{ accessToken: string; expiresAt: string }> {
  const config = appId && appSecret ? { appId, appSecret } : getMetaAppConfig();
  const url = `https://graph.facebook.com/v25.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${config.appId}&client_secret=${config.appSecret}&fb_exchange_token=${token}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: "Token exchange failed" } }));
    throw new Error(err.error?.message || "Long-lived token exchange failed");
  }
  const data = await res.json();
  const expiresAt = new Date(Date.now() + (data.expires_in || 5184000) * 1000).toISOString();
  return { accessToken: data.access_token, expiresAt };
}

export async function fetchAdAccounts(accessToken: string): Promise<MetaAdAccount[]> {
  const url = `https://graph.facebook.com/v25.0/me/adaccounts?fields=id,name,currency,account_id,account_status&access_token=${accessToken}&limit=100`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: "Failed to fetch ad accounts" } }));
    throw new Error(err.error?.message || "Failed to fetch ad accounts");
  }
  const data = await res.json();
  return (data.data || []).map((a: any) => ({
    id: a.id,
    name: a.name || "Unnamed Account",
    currency: a.currency || "USD",
    accountId: a.account_id || "",
    status: a.account_status !== undefined ? (a.account_status === 1 ? "ACTIVE" : "INACTIVE") : "UNKNOWN",
  }));
}
