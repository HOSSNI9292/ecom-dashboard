"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Globe,
  Warehouse,
  Settings,
  BarChart3,
  ShieldAlert,
  Bot,
  X,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/business-intelligence", label: "Business Intelligence", icon: BarChart3 },
  { href: "/products", label: "Products", icon: Package },
  { href: "/orders", label: "Orders", icon: ShoppingCart },
  { href: "/countries", label: "Countries", icon: Globe },
  { href: "/stock", label: "Stock", icon: Warehouse },
  { href: "/fraud-detection", label: "Fraud Detection", icon: ShieldAlert },
  { href: "/ai-agent", label: "AI Agent", icon: Bot },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-[#0A0A0A] border-r border-[#1F1F1F] transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-[#1F1F1F]">
          <Link href="/dashboard" className="flex items-center gap-2.5 group" onClick={onClose}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#06B6D4] to-[#0891B2] flex items-center justify-center shadow-[0_0_16px_rgba(6,182,212,0.2)] group-hover:shadow-[0_0_24px_rgba(6,182,212,0.3)] transition-shadow duration-200">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <div>
              <span className="text-white font-semibold text-sm">COD Analytics</span>
              <p className="text-[#606060] text-[10px]">Dashboard v2.0</p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden text-[#606060] hover:text-white transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? "bg-[#06B6D4]/10 text-[#22D3EE]"
                    : "text-[#606060] hover:text-white hover:bg-[#111111]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-5 h-5 transition-colors duration-200 ${
                    isActive ? "text-[#22D3EE]" : "text-[#606060] group-hover:text-white"
                  }`} />
                  {item.label}
                </div>
                {isActive && (
                  <div className="w-1 h-5 rounded-full bg-[#06B6D4] shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
