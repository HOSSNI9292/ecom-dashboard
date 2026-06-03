"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { ThemeProvider } from "@/context/ThemeContext";
import { NotificationsProvider } from "@/context/NotificationsContext";
import { Sun, Moon } from "lucide-react";
import "./globals.css";

function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("cod_dashboard_theme");
    if (stored === "light") setDark(false);
  }, []);

  const toggle = () => {
    setDark((d) => !d);
    const newTheme = dark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("cod_dashboard_theme", newTheme);
  };

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg text-[#64748B] hover:text-white hover:bg-[#111827] transition-all duration-200"
      title={`Switch to ${dark ? "light" : "dark"} mode`}
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

function LayoutInner({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#0B0F19] text-[#F8FAFC]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
          actions={
            <div className="flex items-center gap-1">
              <ThemeToggle />
            </div>
          }
        />
        <main className="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <ThemeProvider>
          <NotificationsProvider>
            <LayoutInner>{children}</LayoutInner>
          </NotificationsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
