"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/orders": "Orders",
  "/delivered": "Delivered Orders",
  "/products": "Products",
  "/countries": "Countries",
  "/stock": "Stock Management",
  "/settings": "Settings",
  "/business-intelligence": "Business Intelligence",
  "/executive-bi": "Executive BI",
  "/fraud-detection": "Fraud Detection",
  "/ai-agent": "AI Agent",
};

interface NavbarProps {
  onMenuClick: () => void;
  onRefresh?: () => void;
  actions?: React.ReactNode;
}

export function Navbar({ onMenuClick, actions }: NavbarProps) {
  const pathname = usePathname();
  const title = pageTitles[pathname] || "Dashboard";

  return (
    <header className="sticky top-0 z-30 bg-[#0A0A0B]/80 backdrop-blur-xl border-b border-[#27272A] px-4 lg:px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl text-[#3F3F46] hover:text-[#FAFAFA] hover:bg-[#141417] transition-all duration-200"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-[#FAFAFA]">{title}</h1>
            <p className="text-[#71717A] text-[11px] hidden sm:block">Real-time analytics overview</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {actions}
        </div>
      </div>
    </header>
  );
}
