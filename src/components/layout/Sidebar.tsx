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
  CheckCircle,
  X,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/business-intelligence", label: "Business Intelligence", icon: BarChart3 },
  { href: "/executive-bi", label: "Executive BI", icon: TrendingUp },
  { href: "/products", label: "Products", icon: Package },
  { href: "/orders", label: "Orders", icon: ShoppingCart },
  { href: "/delivered", label: "Delivered", icon: CheckCircle },
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
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-[#0B0F19] border-r border-[#1F2937] transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-[#1F2937]">
          <Link href="/dashboard" className="flex items-center gap-2.5 group" onClick={onClose}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center shadow-[0_0_16px_rgba(99,102,241,0.15)] group-hover:shadow-[0_0_24px_rgba(99,102,241,0.25)] transition-shadow duration-200">
              <svg width="20" height="20" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-90">
                <path d="M12 26V14l6-4 6 4v12l-6 4-6-4z" stroke="white" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
                <path d="M18 10v12" stroke="white" strokeWidth="1.5" />
                <path d="M12 14l6 4 6-4" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <span className="text-white font-semibold text-sm">COD Analytics</span>
              <p className="text-[#64748B] text-[10px]">Dashboard v2.0</p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden text-[#64748B] hover:text-white transition-colors duration-200"
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
                    ? "bg-[#6366F1]/10 text-[#6366F1]"
                    : "text-[#64748B] hover:text-white hover:bg-[#111827]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-5 h-5 transition-colors duration-200 ${
                    isActive ? "text-[#6366F1]" : "text-[#64748B] group-hover:text-white"
                  }`} />
                  {item.label}
                </div>
                {isActive && (
                  <div className="w-1 h-5 rounded-full bg-[#6366F1] shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
