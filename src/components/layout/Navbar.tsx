"use client";

import { Menu, RefreshCw } from "lucide-react";
import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/orders": "Orders",
  "/delivered": "Delivered Orders",
  "/products": "Products",
  "/countries": "Countries",
  "/stock": "Stock Management",
  "/settings": "Settings",
};

interface NavbarProps {
  onMenuClick: () => void;
  onRefresh?: () => void;
  actions?: React.ReactNode;
}

export function Navbar({ onMenuClick, onRefresh, actions }: NavbarProps) {
  const pathname = usePathname();
  const title = pageTitles[pathname] || "Dashboard";

  return (
    <header className="sticky top-0 z-30 bg-[#0B0F19]/80 backdrop-blur-xl border-b border-[#1F2937] px-4 lg:px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg text-[#64748B] hover:text-white hover:bg-[#111827] transition-all duration-200"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-semibold text-white">{title}</h1>
            <p className="text-[#64748B] text-[11px] hidden sm:block">Real-time analytics overview</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {actions}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg text-[#64748B] hover:text-white hover:bg-[#111827] transition-all duration-200"
              title="Refresh data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
