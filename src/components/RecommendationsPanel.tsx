"use client";

import { useTranslation } from "react-i18next";
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

function priorityColor(priority: string): string {
  switch (priority) {
    case "high": return "border-l-[#EF4444]";
    case "medium": return "border-l-[#F59E0B]";
    case "low": return "border-l-[#64748B]";
    default: return "border-l-[#64748B]";
  }
}

function priorityLabel(priority: string, t: (key: string) => string): string {
  switch (priority) {
    case "high": return t("insights.priorityHigh");
    case "medium": return t("insights.priorityMedium");
    case "low": return t("insights.priorityLow");
    default: return "";
  }
}

function RecommendationItem({ rec, onMarkRead }: { rec: Recommendation; onMarkRead?: (id: string) => void }) {
  const cfg = typeConfig[rec.type] || typeConfig.alert;
  const IconComp = cfg.icon;

  return (
    <div
      className={`relative pl-4 border-l-2 ${priorityColor(rec.priority)} py-3 px-4 rounded-lg bg-[#111827] hover:bg-[#1A1F2E] transition-colors ${rec.read ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${cfg.bg} shrink-0 mt-0.5`}>
          <IconComp className={`w-4 h-4 ${cfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-white text-sm font-semibold">{rec.title}</h4>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
              rec.priority === "high" ? "bg-[#EF4444]/10 text-[#EF4444]" :
              rec.priority === "medium" ? "bg-[#F59E0B]/10 text-[#F59E0B]" :
              "bg-[#64748B]/10 text-[#64748B]"
            }`}>
              {priorityLabel(rec.priority, (key: string) => key)}
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
            className="p-1 rounded text-[#64748B] hover:text-white hover:bg-[#1F2937] transition-colors shrink-0"
            title="Mark as read"
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
              className="p-1.5 rounded-lg text-[#64748B] hover:text-white hover:bg-[#1F2937] transition-all"
              title={t("common.refresh")}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </CardHeader>
      <div className="px-6 pb-6 space-y-2">
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
            <span className="text-[#6366F1] text-xs font-medium">{t("insights.viewAll")} ({recommendations.length})</span>
          </div>
        )}
      </div>
    </Card>
  );
}
