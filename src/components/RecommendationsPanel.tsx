"use client";

import { useTranslation } from "react-i18next";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, AlertTriangle, Star, ShieldAlert,
  DollarSign, Target, Globe, Package, Zap, RefreshCw, CheckCircle,
} from "lucide-react";
import type { Recommendation } from "@/types/meta";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

interface RecommendationsPanelProps {
  recommendations: Recommendation[];
  loading: boolean;
  onRefresh: () => void;
  onMarkRead?: (id: string) => void;
  compact?: boolean;
}

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

function priorityBorder(priority: string): string {
  switch (priority) {
    case "high": return "border-l-[#EF4444]";
    case "medium": return "border-l-[#F59E0B]";
    case "low": return "border-l-[#10B981]";
    default: return "border-l-[#64748B]";
  }
}

function RecommendationItem({ rec, onMarkRead }: { rec: Recommendation; onMarkRead?: (id: string) => void }) {
  const { t } = useTranslation();
  const cfg = typeConfig[rec.type] || typeConfig.alert;
  const IconComp = cfg.icon;
  const badge = priorityBadge(rec.priority, t);

  return (
    <div
      className={`relative pl-4 border-l-2 ${priorityBorder(rec.priority)} py-4 px-4 rounded-lg bg-[#111827] hover:bg-[#1A1F2E] hover:border-l-[#6366F1]/50 transition-all duration-200 cursor-default ${rec.read ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${cfg.bg} shrink-0 mt-0.5`}>
          <IconComp className={`w-4 h-4 ${cfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-white text-sm font-semibold">{rec.title}</h4>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${badge.classes}`}>
              {badge.label}
            </span>
          </div>
          <p className="text-[#94A3B8] text-xs mt-1">{rec.description}</p>
          {rec.metric && rec.value !== undefined && (
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[#64748B] text-[10px]">{rec.metric}: {typeof rec.value === "number" ? (rec.value >= 1000 ? `${Math.round(rec.value).toLocaleString()}` : rec.value.toFixed(2)) : rec.value}</span>
            </div>
          )}
        </div>
        {onMarkRead && !rec.read && (
          <button
            onClick={() => onMarkRead(rec.id)}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-white hover:bg-[#1F2937] transition-all duration-200 shrink-0 cursor-pointer"
            title={t("insights.markAsRead")}
          >
            <CheckCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function RecommendationsPanel({ recommendations, loading, onRefresh, onMarkRead, compact }: RecommendationsPanelProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("insights.title")}</CardTitle>
        </CardHeader>
        <div className="px-6 pb-6 space-y-3">
          {Array.from({ length: compact ? 3 : 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 skeleton rounded w-3/4" />
              <div className="h-3 skeleton rounded w-1/2" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const displayRecs = compact ? recommendations.slice(0, 4) : recommendations;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("insights.title")}</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-[#64748B] text-[10px]">{recommendations.length} {t("insights.recommendations")}</span>
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg text-[#64748B] hover:text-white hover:bg-[#1F2937] transition-all duration-200 cursor-pointer"
              title={t("common.refresh")}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </CardHeader>
      <div className="px-6 pb-6 space-y-3">
        {displayRecs.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-xl bg-[#10B981]/10 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6 text-[#10B981]" />
            </div>
            <p className="text-[#94A3B8] text-sm">{t("insights.noRecommendations")}</p>
          </div>
        ) : (
          displayRecs.map((rec) => (
            <RecommendationItem key={rec.id} rec={rec} onMarkRead={onMarkRead} />
          ))
        )}
        {compact && recommendations.length > 4 && (
          <div className="text-center pt-2">
            <Link
              href="/insights"
              className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-medium text-[#6366F1] hover:text-white hover:bg-[#6366F1]/10 border border-[#6366F1]/20 hover:border-[#6366F1]/50 transition-all duration-200 cursor-pointer"
            >
              {t("insights.viewAll")} ({recommendations.length})
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}
