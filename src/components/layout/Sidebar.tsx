"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  TrendingUp,
  Package,
  ShoppingCart,
  CheckCircle,
  Globe,
  Warehouse,
  Settings,
  ShieldAlert,
  Bot,
  X,
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

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-[#0A0A0B] border-r border-[#27272A] transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-[#27272A]">
          <Link href="/dashboard" className="flex items-center gap-3 group" onClick={onClose}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#10B981] to-[#0EA5E9] flex items-center justify-center shadow-lg shadow-[#10B981]/20 group-hover:shadow-[#10B981]/30 transition-shadow duration-300">
              <span className="text-white font-bold text-sm">CA</span>
            </div>
            <div>
              <span className="text-[#FAFAFA] font-semibold text-sm">COD Analytics</span>
              <p className="text-[#3F3F46] text-[10px]">Premium Dashboard</p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden text-[#3F3F46] hover:text-[#FAFAFA] transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  active
                    ? "bg-[#10B981]/10 text-[#34D399]"
                    : "text-[#3F3F46] hover:text-[#FAFAFA] hover:bg-[#141417]"
                }`}
              >
                <item.icon className={`w-5 h-5 transition-all duration-200 ${
                  active ? "text-[#34D399]" : "text-[#3F3F46] group-hover:text-[#FAFAFA]"
                }`} />
                <span className="flex-1">{item.label}</span>
                {active && (
                  <div className="w-1.5 h-1.5 rounded-full bg-[#34D399] shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
