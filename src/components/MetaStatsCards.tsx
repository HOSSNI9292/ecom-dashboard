"use client";

import { DollarSign, TrendingUp, Target, BarChart3, Trophy, AlertTriangle, Globe, Package, Facebook, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { getMetaConnection, clearMetaCredentials } from "@/services/meta";
import type { MetaSummary } from "@/types/meta";

interface MetaStatsCardsProps {
  data: MetaSummary | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onSetup: () => void;
  hasCredentials: boolean;
}

export function MetaStatsCards({ data, loading, error, onRefresh, onSetup, hasCredentials }: MetaStatsCardsProps) {
  const { t } = useTranslation();
  const connection = hasCredentials ? getMetaConnection() : null;

  if (!hasCredentials) {
    return (
      <Card className="border border-[#1F2937]/80 border-dashed">
        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#6366F1]/10 flex items-center justify-center mx-auto mb-3">
            <Facebook className="w-6 h-6 text-[#6366F1]" />
          </div>
          <h3 className="text-white font-semibold mb-1">{t("meta.connectMetaAds")}</h3>
          <p className="text-[#64748B] text-sm mb-4">{t("meta.connectMetaDesc")}</p>
          <button
            onClick={onSetup}
            className="px-4 py-2 rounded-lg bg-[#1877F2] text-white text-sm font-medium hover:bg-[#166FE5] transition-colors"
          >
            {t("meta.setupNow")}
          </button>
        </div>
      </Card>
    );
  }

  if (loading && !data) {
    return (
      <Card>
        <div className="p-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 skeleton rounded w-20" />
                <div className="h-7 skeleton rounded w-28" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Card className="border border-red-500/20">
        <div className="p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-[#EF4444] mx-auto mb-2" />
          <p className="text-[#EF4444] text-sm mb-3">{error}</p>
          <button
            onClick={onRefresh}
            className="px-4 py-2 rounded-lg bg-[#1F2937] text-white text-sm font-medium hover:bg-[#334155] transition-colors"
          >
            {t("common.retry")}
          </button>
        </div>
      </Card>
    );
  }

  if (!data) return null;

  const cards = [
    {
      title: t("meta.totalSpend"),
      value: `${Math.round(data.totalSpend).toLocaleString()} XOF`,
      icon: <DollarSign className="w-5 h-5" />,
      color: "primary" as const,
    },
    {
      title: t("meta.averageCpa"),
      value: data.averageCpa > 0 ? `${Math.round(data.averageCpa).toLocaleString()} XOF` : t("common.noData"),
      icon: <Target className="w-5 h-5" />,
      color: "warning" as const,
    },
    {
      title: t("meta.averageCtr"),
      value: `${data.averageCtr.toFixed(2)}%`,
      icon: <TrendingUp className="w-5 h-5" />,
      color: "info" as const,
    },
    {
      title: t("meta.averageRoas"),
      value: `${data.averageRoas.toFixed(2)}x`,
      icon: <BarChart3 className="w-5 h-5" />,
      color: data.averageRoas >= 1.5 ? "success" as const : "error" as const,
      tooltip: data.averageRoas >= 1.5 ? t("meta.roasHealthy") : t("meta.roasLow"),
    },
    {
      title: t("meta.bestCampaign"),
      value: data.bestCampaign ? data.bestCampaign.name : t("common.noData"),
      icon: <Trophy className="w-5 h-5" />,
      color: "success" as const,
      subtitle: data.bestCampaign ? `ROAS ${data.bestCampaign.roas.toFixed(2)}x` : undefined,
    },
    {
      title: t("meta.worstCampaign"),
      value: data.worstCampaign ? data.worstCampaign.name : t("common.noData"),
      icon: <AlertTriangle className="w-5 h-5" />,
      color: "error" as const,
      subtitle: data.worstCampaign ? `ROAS ${data.worstCampaign.roas.toFixed(2)}x` : undefined,
    },
    {
      title: t("meta.bestProduct"),
      value: data.bestProduct || t("common.noData"),
      icon: <Package className="w-5 h-5" />,
      color: "accent" as const,
    },
    {
      title: t("meta.bestCountry"),
      value: data.bestCountry || t("common.noData"),
      icon: <Globe className="w-5 h-5" />,
      color: "primary" as const,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>{t("meta.metaAdsPerformance")}</CardTitle>
            {connection?.connected && (
              <span className="flex items-center gap-1 text-[10px] text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-full">
                <CheckCircle className="w-3 h-3" />
                {t("meta.connected")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              {connection?.adAccountName && (
                <span className="text-[#64748B] text-[10px] max-w-[120px] truncate">{connection.adAccountName}</span>
              )}
              {data.lastSynced && (
                <span className="text-[#64748B] text-[10px]">
                  {t("meta.lastSynced")}: {new Date(data.lastSynced).toLocaleString()}
                </span>
              )}
            </div>
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg text-[#64748B] hover:text-white hover:bg-[#1F2937] transition-all"
              title={t("common.refresh")}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
            </button>
          </div>
        </div>
      </CardHeader>
      <div className="px-6 pb-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card, i) => (
            <div key={i} className="p-4 rounded-xl bg-[#111827] border border-[#1F2937]/80">
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-2 rounded-lg ${
                  card.color === "primary" ? "bg-[#6366F1]/10 text-[#6366F1]" :
                  card.color === "success" ? "bg-[#10B981]/10 text-[#10B981]" :
                  card.color === "warning" ? "bg-[#F59E0B]/10 text-[#F59E0B]" :
                  card.color === "error" ? "bg-[#EF4444]/10 text-[#EF4444]" :
                  card.color === "info" ? "bg-[#6366F1]/10 text-[#6366F1]" :
                  "bg-[#8B5CF6]/10 text-[#8B5CF6]"
                }`}>
                  {card.icon}
                </div>
                <span className="text-[#94A3B8] text-xs font-medium uppercase tracking-wider">{card.title}</span>
                {card.tooltip && (
                  <span
                    title={card.tooltip}
                    className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[#1F2937] text-[#64748B] text-[10px] font-bold cursor-help shrink-0 ml-auto"
                  >
                    ?
                  </span>
                )}
              </div>
              <p className="text-white text-lg font-bold truncate">{card.value}</p>
              {card.subtitle && (
                <p className="text-[#64748B] text-xs mt-1">{card.subtitle}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
