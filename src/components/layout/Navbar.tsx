"use client";

import { useTranslation } from "react-i18next";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";

const pageTitleKeys: Record<string, string> = {
  "/dashboard": "nav.dashboard",
  "/profit-dashboard": "nav.profitDashboard",
  "/orders": "nav.orders",
  "/delivered": "nav.delivered",
  "/products": "nav.products",
  "/countries": "nav.countries",
  "/stock": "nav.stock",
  "/settings": "nav.settings",
  "/settings/fees": "nav.settings",
  "/settings/product-costs": "nav.settings",
  "/fraud-detection": "nav.fraudDetection",
  "/ai-agent": "nav.aiAgent",
  "/ai-insights": "nav.aiInsights",
  "/business-intelligence": "nav.businessIntelligence",
  "/executive-bi": "nav.executiveBi",
};

interface NavbarProps {
  onMenuClick: () => void;
  onRefresh?: () => void;
  actions?: React.ReactNode;
}

export function Navbar({ onMenuClick, onRefresh, actions }: NavbarProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const titleKey = pageTitleKeys[pathname] || "nav.dashboard";

  return (
    <header className="sticky top-0 z-30 bg-[#0B0F19]/80 backdrop-blur-xl border-b border-[#1F2937]/80 px-4 lg:px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg text-[#64748B] hover:text-white hover:bg-[#111827] transition-all duration-200"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-semibold text-white">{t(titleKey)}</h1>
            <p className="text-[#94A3B8] text-[11px] hidden sm:block">{t("nav.subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {actions}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg text-[#64748B] hover:text-white hover:bg-[#111827] transition-all duration-200"
              title={t("common.refresh")}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
