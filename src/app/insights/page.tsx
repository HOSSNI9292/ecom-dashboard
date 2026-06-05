"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Lightbulb, TrendingUp, TrendingDown, AlertTriangle, Star, ShieldAlert,
  DollarSign, Target, Globe, Package, Zap, CheckCircle, RefreshCw, Filter, X,
} from "lucide-react";
import { PageWrapper } from "@/components/PageWrapper";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { useDashboardData } from "@/hooks";
import { useRecommendations } from "@/hooks/useRecommendations";
import { useMetaAds } from "@/hooks/useMetaAds";
import type { Recommendation } from "@/types/meta";

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  increase_budget: { icon: TrendingUp, color: "text-[#10B981]", bg: "bg-[#10B981]/10" },
  decrease_budget: { icon: TrendingDown, color: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10" },
  stop_campaign: { icon: ShieldAlert, color: "text-[#EF4444]", bg: "bg-[#EF4444]/10" },
  scale_campaign: { icon: Zap, color: "text-[#6366F1]", bg: "bg-[#6366F1]/10" },
  raise_price: { icon: DollarSign, color: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10" },
  lower_price: { icon: DollarSign, color: "text-[#8B5CF6]", bg: "bg-[#8B5CF6]/10" },
  change_country: { icon: Globe, color: "text-[#6366F1]", bg: "bg-[#6366F1]/10" },
  detect_losing: { icon: AlertTriangle, color: "text-[#EF4444]", bg: "bg-[#EF4444]/10" },
  detect_winning: { icon: Star, color: "text-[#10B981]", bg: "bg-[#10B981]/10" },
  alert: { icon: AlertTriangle, color: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10" },
};

function priorityBadge(priority: string, t: (key: string) => string): { label: string; classes: string } {
  switch (priority) {
    case "high":
      return { label: t("insights.priorityHigh"), classes: "bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20" };
    case "medium":
      return { label: t("insights.priorityMedium"), classes: "bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20" };
    case "low":
      return { label: t("insights.priorityLow"), classes: "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20" };
    default:
      return { label: "", classes: "bg-[#64748B]/10 text-[#64748B] border border-[#64748B]/20" };
  }
}

type FilterKey = "all" | "high" | "medium" | "low";

const FILTERS: { key: FilterKey; labelKey: string }[] = [
  { key: "all", labelKey: "insights.filterAll" },
  { key: "high", labelKey: "insights.filterHigh" },
  { key: "medium", labelKey: "insights.filterMedium" },
  { key: "low", labelKey: "insights.filterLow" },
];

function RecommendationCard({
  rec,
  onDismiss,
  t,
}: {
  rec: Recommendation;
  onDismiss: (id: string) => void;
  t: (key: string) => string;
}) {
  const cfg = typeConfig[rec.type] || typeConfig.alert;
  const IconComp = cfg.icon;
  const badge = priorityBadge(rec.priority, t);

  return (
    <div
      className={`rounded-xl border ${rec.read ? "border-[#1F2937] opacity-60" : "border-[#1F2937]"} bg-[#111827] hover:bg-[#1A1F2E] hover:border-[#6366F1]/30 transition-all duration-200 overflow-hidden`}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className={`p-2.5 rounded-lg ${cfg.bg} shrink-0`}>
            <IconComp className={`w-5 h-5 ${cfg.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-white text-sm font-semibold">{rec.title}</h3>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${badge.classes}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-[#94A3B8] text-xs leading-relaxed">{rec.description}</p>
            {rec.metric && rec.value !== undefined && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0B0F19] border border-[#1F2937]">
                <span className="text-[#64748B] text-[10px] uppercase tracking-wider">{rec.metric}:</span>
                <span className="text-white text-xs font-medium">
                  {typeof rec.value === "number"
                    ? rec.value >= 1000
                      ? Math.round(rec.value).toLocaleString()
                      : rec.value.toFixed(2)
                    : rec.value}
                </span>
              </div>
            )}
            <div className="flex items-center gap-3 mt-3 text-[#64748B] text-[11px]">
              <span>{t("insights.createdAt")}: {new Date(rec.date).toLocaleDateString()}</span>
              <span className="w-1 h-1 rounded-full bg-[#1F2937]" />
              <span className={rec.read ? "text-[#64748B]" : "text-[#10B981]"}>
                {rec.read ? t("insights.statusDismissed") : t("insights.statusActive")}
              </span>
            </div>
          </div>
          {!rec.read && (
            <button
              onClick={() => onDismiss(rec.id)}
              className="p-2 rounded-lg text-[#64748B] hover:text-white hover:bg-[#1F2937] transition-all duration-200 cursor-pointer shrink-0"
              title={t("insights.dismiss")}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const { t, i18n } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const { data, loading: codLoading, error, refetch } = useDashboardData();
  const { data: metaData } = useMetaAds();
  const { data: recData, loading: recLoading, refresh: refreshRecs, markRead } = useRecommendations(
    data?.stats ?? null,
    data?.countries ?? [],
    data?.products ?? [],
    metaData
  );

  const isLoading = codLoading || recLoading;

  const allRecs = recData?.recommendations ?? [];
  const filteredRecs = activeFilter === "all"
    ? allRecs
    : allRecs.filter((r) => r.priority === activeFilter);
  const counts = {
    all: allRecs.length,
    high: allRecs.filter((r) => r.priority === "high").length,
    medium: allRecs.filter((r) => r.priority === "medium").length,
    low: allRecs.filter((r) => r.priority === "low").length,
  };

  function handleDismiss(id: string) {
    markRead(id);
  }

  return (
    <PageWrapper loading={isLoading} error={error} onRetry={refetch} hasData={!!data}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-semibold text-white">{t("insights.insightsPage")}</h1>
            <p className="text-[#94A3B8] text-xs mt-0.5">{t("insights.subtitle")}</p>
          </div>
          <button
            onClick={refreshRecs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#64748B] hover:text-white hover:bg-[#111827] border border-[#1F2937]/80 transition-all duration-200 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            {t("insights.refresh")}
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                activeFilter === f.key
                  ? "bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/30"
                  : "text-[#64748B] hover:text-white hover:bg-[#111827] border border-[#1F2937]/80"
              }`}
            >
              {f.key !== "all" && (
                <span className={`w-1.5 h-1.5 rounded-full ${
                  f.key === "high" ? "bg-[#EF4444]" : f.key === "medium" ? "bg-[#F59E0B]" : "bg-[#10B981]"
                }`} />
              )}
              {t(f.labelKey)}
              <span className="ml-0.5 text-[10px] opacity-60">({counts[f.key]})</span>
            </button>
          ))}
        </div>

        {filteredRecs.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-[#6366F1]/10 flex items-center justify-center mx-auto mb-4">
              <Lightbulb className="w-7 h-7 text-[#6366F1]" />
            </div>
            <h3 className="text-white text-sm font-semibold mb-1">{t("insights.noRecommendations")}</h3>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRecs.map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} onDismiss={handleDismiss} t={t} />
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
