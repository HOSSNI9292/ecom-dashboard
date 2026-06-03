"use client";

import { Card } from "./Card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: { value: number; isUp: boolean };
  subtitle?: string;
  color?: "primary" | "success" | "warning" | "error" | "info" | "accent" | "secondary";
  delay?: number;
  glass?: boolean;
}

const colorMap = {
  primary: { bg: "bg-[#10B981]/10", text: "text-[#10B981]", gradient: "from-[#10B981]/20 to-transparent" },
  accent: { bg: "bg-[#10B981]/10", text: "text-[#10B981]", gradient: "from-[#10B981]/20 to-transparent" },
  secondary: { bg: "bg-[#0EA5E9]/10", text: "text-[#0EA5E9]", gradient: "from-[#0EA5E9]/20 to-transparent" },
  success: { bg: "bg-[#10B981]/10", text: "text-[#10B981]", gradient: "from-[#10B981]/20 to-transparent" },
  warning: { bg: "bg-[#F59E0B]/10", text: "text-[#F59E0B]", gradient: "from-[#F59E0B]/20 to-transparent" },
  error: { bg: "bg-[#EF4444]/10", text: "text-[#EF4444]", gradient: "from-[#EF4444]/20 to-transparent" },
  info: { bg: "bg-[#10B981]/10", text: "text-[#10B981]", gradient: "from-[#10B981]/20 to-transparent" },
};

export function StatCard({ title, value, icon, trend, subtitle, color = "primary", delay = 0, glass = false }: StatCardProps) {
  const c = colorMap[color] || colorMap.primary;

  return (
    <div
      className="opacity-0 animate-fade-in"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}
    >
      <Card hover={false} glass={glass} glow={glass}>
        <div className="flex items-start justify-between relative">
          <div className="flex-1 min-w-0 z-10">
            <p className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider">{title}</p>
            <p className="text-3xl sm:text-4xl font-bold text-[#FAFAFA] mt-2 tracking-tight">{value}</p>
            {trend && (
              <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend.isUp ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                {trend.isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>{Math.abs(trend.value)}% vs last period</span>
              </div>
            )}
            {subtitle && <p className="text-[#71717A] text-xs mt-1.5">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-xl ${c.bg} ${c.text} shrink-0 ml-3 z-10`}>
            {icon}
          </div>
        </div>
      </Card>
    </div>
  );
}
