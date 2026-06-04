"use client";

import { useTranslation } from "react-i18next";
import { Lightbulb, RefreshCw, AlertTriangle, TrendingUp, BarChart3 } from "lucide-react";
import { PageWrapper } from "@/components/PageWrapper";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { RecommendationsPanel } from "@/components/RecommendationsPanel";
import { useDashboardData } from "@/hooks";
import { useRecommendations } from "@/hooks/useRecommendations";
import { useMetaAds } from "@/hooks/useMetaAds";

export default function AIInsightsPage() {
  const { t, i18n } = useTranslation();
  const { data, loading: codLoading, error: codError, refetch } = useDashboardData();
  const { data: metaData, loading: metaLoading, error: metaError, refresh: refreshMeta, hasCredentials } = useMetaAds();
  const { data: recData, loading: recLoading, refresh: refreshRecs, markRead } = useRecommendations(
    data?.stats ?? null,
    data?.countries ?? [],
    data?.products ?? [],
    metaData
  );

  const isLoading = codLoading || recLoading;
  const error = codError;

  return (
    <PageWrapper loading={isLoading} error={error} onRetry={refetch} hasData={!!data}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-semibold text-white">{t("insights.title")}</h1>
            <p className="text-[#94A3B8] text-xs mt-0.5">{t("insights.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            {!hasCredentials && (
              <a
                href="/settings"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#6366F1] hover:text-white hover:bg-[#6366F1]/10 border border-[#6366F1]/30 transition-all duration-200"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                {t("meta.connectMetaAds")}
              </a>
            )}
            <button
              onClick={() => { refreshMeta(); refreshRecs(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#64748B] hover:text-white hover:bg-[#111827] border border-[#1F2937]/80 transition-all duration-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              {t("insights.refresh")}
            </button>
          </div>
        </div>

        {metaError && (
          <Card className="border border-[#EF4444]/20">
            <div className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-[#EF4444] shrink-0" />
              <div>
                <p className="text-[#EF4444] text-sm font-medium">{t("common.error")}: Meta Ads</p>
                <p className="text-[#94A3B8] text-xs">{metaError}</p>
              </div>
            </div>
          </Card>
        )}

        {recData?.generatedAt && (
          <Card>
            <div className="px-6 py-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#6366F1]/10">
                <Lightbulb className="w-4 h-4 text-[#6366F1]" />
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{t("insights.dailyReport")}</p>
                <p className="text-[#64748B] text-[11px]">
                  {t("insights.generatedAt")}: {new Date(recData.generatedAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-1">
                  <div className="w-2 h-2 rounded-full bg-[#EF4444]" />
                  <div className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                  <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                </div>
                <span className="text-[#64748B] text-xs">
                  {recData.recommendations.filter(r => r.priority === "high").length} {t("insights.priorityHigh").toLowerCase()}
                </span>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecommendationsPanel
              recommendations={recData?.recommendations ?? []}
              loading={isLoading}
              onRefresh={() => { refreshMeta(); refreshRecs(); }}
              onMarkRead={markRead}
            />
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("insights.priorityHigh")} {t("insights.recommendations")}</CardTitle>
              </CardHeader>
              <div className="px-6 pb-6">
                {(recData?.recommendations ?? []).filter(r => r.priority === "high").length === 0 ? (
                  <div className="text-center py-6">
                    <TrendingUp className="w-8 h-8 text-[#10B981] mx-auto mb-2" />
                    <p className="text-[#94A3B8] text-sm">{t("insights.noRecommendations")}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(recData?.recommendations ?? [])
                      .filter(r => r.priority === "high")
                      .slice(0, 5)
                      .map((rec) => (
                        <div key={rec.id} className="flex items-start gap-2 p-2 rounded-lg bg-[#111827]">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#EF4444] mt-1.5 shrink-0" />
                          <p className="text-white text-xs">{rec.title}</p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("meta.metaAdsPerformance")}</CardTitle>
              </CardHeader>
              {metaData ? (
                <div className="px-6 pb-6 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[#94A3B8] text-xs">{t("meta.totalSpend")}</span>
                    <span className="text-white text-sm font-bold">{Math.round(metaData.totalSpend).toLocaleString()} XOF</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#94A3B8] text-xs">{t("meta.averageRoas")}</span>
                    <span className={`text-sm font-bold ${metaData.averageRoas >= 1.5 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                      {metaData.averageRoas.toFixed(2)}x
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#94A3B8] text-xs">{t("meta.averageCpa")}</span>
                    <span className="text-white text-sm font-bold">{Math.round(metaData.averageCpa).toLocaleString()} XOF</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#94A3B8] text-xs">{t("meta.averageCtr")}</span>
                    <span className="text-white text-sm font-bold">{metaData.averageCtr.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#94A3B8] text-xs">{t("meta.purchases")}</span>
                    <span className="text-white text-sm font-bold">{metaData.totalPurchases}</span>
                  </div>
                  {metaData.bestCampaign && (
                    <div className="pt-2 border-t border-[#1F2937]/80">
                      <p className="text-[#94A3B8] text-[10px] uppercase tracking-wider mb-1">{t("meta.bestCampaign")}</p>
                      <p className="text-white text-xs truncate">{metaData.bestCampaign.name}</p>
                      <p className="text-[#10B981] text-xs">ROAS {metaData.bestCampaign.roas.toFixed(2)}x</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-6 pb-6">
                  {metaLoading ? (
                    <div className="space-y-2">
                      <div className="h-3 skeleton rounded w-3/4" />
                      <div className="h-3 skeleton rounded w-1/2" />
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <BarChart3 className="w-8 h-8 text-[#64748B] mx-auto mb-2" />
                      <p className="text-[#64748B] text-xs">{t("insights.noMetaData")}</p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
