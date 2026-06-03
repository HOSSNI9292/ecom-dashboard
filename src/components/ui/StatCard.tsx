"use client";

import { Card } from "./Card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: { value: number; isUp: boolean };
  subtitle?: string;
  color?: "primary" | "success" | "warning" | "error" | "info" | "accent";
  delay?: number;
}

const colorMap = {
  primary: { bg: "bg-[#6366F1]/10", text: "text-[#6366F1]" },
  accent: { bg: "bg-[#8B5CF6]/10", text: "text-[#8B5CF6]" },
  success: { bg: "bg-[#10b981]/10", text: "text-[#10b981]" },
  warning: { bg: "bg-[#f59e0b]/10", text: "text-[#f59e0b]" },
  error: { bg: "bg-[#ef4444]/10", text: "text-[#ef4444]" },
  info: { bg: "bg-[#6366F1]/10", text: "text-[#6366F1]" },
};

export function StatCard({ title, value, icon, trend, subtitle, color = "accent", delay = 0 }: StatCardProps) {
  const c = colorMap[color] || colorMap.accent;

  return (
    <div
      className="opacity-0 animate-fade-in"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}
    >
      <Card hover={false}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-[#94A3B8] text-xs font-medium uppercase tracking-widest">{title}</p>
            <p className="text-4xl sm:text-5xl font-bold text-white mt-1.5 leading-none tracking-tight">{value}</p>
            {trend && (
              <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend.isUp ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                {trend.isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>{Math.abs(trend.value)}% vs last period</span>
              </div>
            )}
            {subtitle && <p className="text-[#64748B] text-xs mt-1.5">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-xl ${c.bg} ${c.text} shrink-0 ml-3`}>
            {icon}
          </div>
        </div>
      </Card>
    </div>
  );
}
