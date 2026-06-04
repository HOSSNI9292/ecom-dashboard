"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Facebook, CheckCircle, AlertCircle, Loader2, LogOut,
  RefreshCw, ChevronDown, Globe, ExternalLink, Info,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  getMetaAppConfig, saveMetaAppConfig,
  getMetaConnection, saveMetaConnection,
  saveMetaCredentials, clearMetaCredentials,
} from "@/services/meta";
import type { MetaAdAccount, MetaConnection as MetaConnectionType } from "@/types/meta";

interface MetaConnectionProps {
  onConnected?: () => void;
}

export function MetaConnection({ onConnected }: MetaConnectionProps) {
  const { t } = useTranslation();
  const [appConfig, setAppConfig] = useState(getMetaAppConfig());
  const [connection, setConnection] = useState<MetaConnectionType>(getMetaConnection());
  const [connecting, setConnecting] = useState(false);
  const [accounts, setAccounts] = useState<MetaAdAccount[]>([]);
  const [showAccounts, setShowAccounts] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<MetaAdAccount | null>(null);
  const [oauthToken, setOauthToken] = useState<string | null>(null);
  const [oauthExpiresAt, setOauthExpiresAt] = useState<string | null>(null);
  const [configSaved, setConfigSaved] = useState(false);
  const [showAppSecret, setShowAppSecret] = useState(false);

  const handleSaveConfig = useCallback(() => {
    saveMetaAppConfig(appConfig);
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2000);
  }, [appConfig]);

  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.data?.type === "meta_oauth_code") {
        const { code, state: returnState } = event.data.data;
        const savedState = localStorage.getItem("meta_oauth_state");
        if (savedState && savedState !== returnState) {
          setConnecting(false);
          alert("OAuth state mismatch — possible CSRF attack");
          return;
        }
        localStorage.removeItem("meta_oauth_state");

        const cfg = getMetaAppConfig();
        if (!cfg.appId || !cfg.appSecret) {
          setConnecting(false);
          alert("Meta App credentials not saved. Please save them first.");
          return;
        }

        try {
          const redirectUri = `${window.location.origin}/api/meta/callback`;
          const res = await fetch("/api/meta/exchange", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code,
              redirectUri,
              appId: cfg.appId,
              appSecret: cfg.appSecret,
            }),
          });
          const data = await res.json();
          if (data.accessToken) {
            setOauthToken(data.accessToken);
            setOauthExpiresAt(data.expiresAt);
            setAccounts(data.accounts || []);
            setShowAccounts(true);
            setConnecting(false);
          } else {
            setConnecting(false);
            alert(data.error || "Token exchange failed");
          }
        } catch (err: any) {
          setConnecting(false);
          alert(err.message || "Token exchange failed");
        }
      }
      if (event.data?.type === "meta_oauth_error") {
        setConnecting(false);
        alert(event.data.error || "OAuth failed");
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const handleConnect = useCallback(() => {
    if (!appConfig.appId) {
      alert(t("meta.appIdRequired"));
      return;
    }
    if (!appConfig.appSecret) {
      alert("Meta App Secret is required");
      return;
    }
    saveMetaAppConfig(appConfig);
    setConnecting(true);
    const redirectUri = `${window.location.origin}/api/meta/callback`;
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem("meta_oauth_state", state);
    const scopes = ["ads_read", "business_management"].join(",");
    const url = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${appConfig.appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}&response_type=code`;
    const w = 600;
    const h = 700;
    const x = window.screen.width / 2 - w / 2;
    const y = window.screen.height / 2 - h / 2;
    window.open(url, "meta_oauth", `width=${w},height=${h},left=${x},top=${y},popup=1`);
  }, [appConfig.appId, appConfig.appSecret, t]);

  const handleSelectAccount = useCallback((account: MetaAdAccount) => {
    setSelectedAccount(account);
    if (oauthToken) {
      const adAccountId = account.accountId.startsWith("act_") ? account.accountId : `act_${account.accountId}`;
      saveMetaCredentials({ adAccountId, accessToken: oauthToken });
      const conn: MetaConnectionType = {
        connected: true,
        adAccountId: adAccountId,
        adAccountName: account.name,
        accessToken: oauthToken,
        lastSyncTime: null,
        tokenExpiresAt: oauthExpiresAt,
      };
      saveMetaConnection(conn);
      setConnection(conn);
      setShowAccounts(false);
      onConnected?.();
    }
  }, [oauthToken, oauthExpiresAt, onConnected]);

  const handleDisconnect = useCallback(() => {
    clearMetaCredentials();
    setConnection({ connected: false, adAccountId: null, adAccountName: null, accessToken: null, lastSyncTime: null, tokenExpiresAt: null });
    setAccounts([]);
    setShowAccounts(false);
    setSelectedAccount(null);
    setOauthToken(null);
  }, []);

  const inputClass = "w-full bg-[#111827] border border-[#1F2937] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:border-[#6366F1]/50 focus:ring-1 focus:ring-[#6366F1]/20 transition-all duration-200 text-sm px-3 py-2.5";

  return (
    <Card hover={false}>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg ${connection.connected ? "bg-[#10B981]/10" : "bg-[#6366F1]/10"}`}>
            <Facebook className={`w-5 h-5 ${connection.connected ? "text-[#10B981]" : "text-[#6366F1]"}`} />
          </div>
          <CardTitle>{t("meta.setupMeta")}</CardTitle>
        </div>
      </CardHeader>

      <div className="space-y-5">
        {connection.connected ? (
          <div className="bg-[#10B981]/5 border border-[#10B981]/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-[#10B981]" />
              <span className="text-[#10B981] text-sm font-semibold">{t("meta.connected")}</span>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">{t("meta.adAccountId")}</span>
                <span className="text-white font-mono text-xs">{connection.adAccountId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">{t("meta.accountName")}</span>
                <span className="text-white">{connection.adAccountName || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">{t("meta.lastSync")}</span>
                <span className="text-white text-xs">
                  {connection.lastSyncTime
                    ? new Date(connection.lastSyncTime).toLocaleString()
                    : t("common.noData")}
                </span>
              </div>
              {connection.tokenExpiresAt && (
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">{t("meta.tokenExpires")}</span>
                  <span className={`text-xs ${new Date(connection.tokenExpiresAt) < new Date() ? "text-[#EF4444]" : "text-[#F59E0B]"}`}>
                    {new Date(connection.tokenExpiresAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] text-sm font-medium transition-all duration-200 border border-[#EF4444]/20"
            >
              <LogOut className="w-4 h-4" />
              {t("meta.disconnect")}
            </button>

            {showAccounts && accounts.length > 0 && (
              <div className="border-t border-[#1F2937]/80 pt-3 mt-3">
                <p className="text-[#94A3B8] text-sm mb-2">{t("meta.selectAccount")}</p>
                <div className="space-y-1">
                  {accounts.map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => handleSelectAccount(acc)}
                      className="w-full text-left flex items-center justify-between p-3 rounded-lg bg-[#111827] hover:bg-[#1A1F2E] border border-[#1F2937] hover:border-[#6366F1]/30 transition-all"
                    >
                      <div>
                        <p className="text-white text-sm font-medium">{acc.name}</p>
                        <p className="text-[#64748B] text-xs">{acc.accountId} · {acc.currency}</p>
                      </div>
                      <div className={`px-2 py-0.5 rounded text-[10px] font-medium ${acc.status === "ACTIVE" ? "bg-[#10B981]/10 text-[#10B981]" : "bg-[#64748B]/10 text-[#64748B]"}`}>
                        {acc.status}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {oauthToken && accounts.length === 0 && (
              <div className="border-t border-[#1F2937]/80 pt-3 mt-3">
                <button
                  onClick={async () => {
                    const res = await fetch("/api/meta/accounts", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ accessToken: oauthToken }),
                    });
                    const data = await res.json();
                    if (data.accounts) {
                      setAccounts(data.accounts);
                      setShowAccounts(true);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6366F1]/10 hover:bg-[#6366F1]/20 text-[#6366F1] text-sm font-medium transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  {t("meta.loadAccounts")}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#1F2937]/30 border border-dashed border-[#1F2937]/80 rounded-xl p-4">
            <p className="text-[#94A3B8] text-sm mb-4">{t("meta.setupDesc")}</p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-[#94A3B8] text-xs font-medium mb-1">{t("meta.appId")}</label>
                <input
                  type="text"
                  value={appConfig.appId}
                  onChange={(e) => setAppConfig((c) => ({ ...c, appId: e.target.value }))}
                  placeholder={t("meta.appIdPlaceholder")}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[#94A3B8] text-xs font-medium mb-1">{t("meta.appSecret")}</label>
                <div className="relative">
                  <input
                    type={showAppSecret ? "text" : "password"}
                    value={appConfig.appSecret}
                    onChange={(e) => setAppConfig((c) => ({ ...c, appSecret: e.target.value }))}
                    placeholder={t("meta.appSecretPlaceholder")}
                    className={inputClass + " pr-10"}
                  />
                  <button
                    onClick={() => setShowAppSecret(!showAppSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white"
                  >
                    {showAppSecret ? <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                  </button>
                </div>
              </div>
              <button
                onClick={handleSaveConfig}
                className="text-[#6366F1] text-xs font-medium hover:text-[#5558E6] transition-colors"
              >
                {configSaved ? t("meta.saved") : t("meta.saveAppConfig")}
              </button>
            </div>

            <a
              href="https://developers.facebook.com/docs/development/create-an-app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[#64748B] text-xs mb-4 hover:text-white transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              {t("meta.howToCreateApp")}
            </a>

            <div className="bg-[#0B0F19] rounded-lg p-3 space-y-1 mb-4">
              <p className="text-[#64748B] text-[10px] font-medium uppercase tracking-wider flex items-center gap-1">
                <Info className="w-3 h-3" />
                {t("meta.requiredPermissions")}
              </p>
              <code className="block text-[#8B5CF6] text-xs font-mono">ads_read</code>
              <code className="block text-[#8B5CF6] text-xs font-mono">business_management</code>
            </div>

            <button
              onClick={handleConnect}
              disabled={connecting || !appConfig.appId}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_16px_rgba(24,119,242,0.2)] hover:shadow-[0_0_24px_rgba(24,119,242,0.3)]"
            >
              {connecting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Facebook className="w-5 h-5" />
              )}
              {connecting ? t("meta.connecting") : t("meta.connectMetaAds")}
            </button>

            {showAccounts && accounts.length > 0 && (
              <div className="mt-4 border-t border-[#1F2937]/80 pt-4">
                <p className="text-[#94A3B8] text-sm mb-2">{t("meta.selectAccount")}</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {accounts.map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => handleSelectAccount(acc)}
                      className="w-full text-left flex items-center justify-between p-3 rounded-lg bg-[#111827] hover:bg-[#1A1F2E] border border-[#1F2937] hover:border-[#6366F1]/30 transition-all"
                    >
                      <div>
                        <p className="text-white text-sm font-medium">{acc.name}</p>
                        <p className="text-[#64748B] text-xs">{acc.accountId} · {acc.currency}</p>
                      </div>
                      <div className={`px-2 py-0.5 rounded text-[10px] font-medium ${acc.status === "ACTIVE" ? "bg-[#10B981]/10 text-[#10B981]" : "bg-[#64748B]/10 text-[#64748B]"}`}>
                        {acc.status}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
