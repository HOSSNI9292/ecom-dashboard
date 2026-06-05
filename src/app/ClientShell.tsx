"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { ThemeProvider } from "@/context/ThemeContext";
import { NotificationsProvider } from "@/context/NotificationsContext";
import { Sun, Moon, Globe, ChevronDown } from "lucide-react";
import i18n, { setLanguage } from "@/i18n";

function ThemeToggle() {
  const [dark, setDark] = useState(true);
  const { t } = useTranslation();

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
      title={dark ? t("theme.switchToLight") : t("theme.switchToDark")}
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

function LanguageSwitcher() {
  const { i18n: i18nInstance } = useTranslation();
  const currentLang = i18nInstance.language || "en";
  const [open, setOpen] = useState(false);

  const languages = [
    { code: "fr", label: "Fran\u00e7ais" },
    { code: "en", label: "English" },
    { code: "ar", label: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629" },
  ];

  const current = languages.find((l) => l.code === currentLang) || languages[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1E293B] border border-[#1F2937]/60 hover:border-[#6366F1]/30 transition-all duration-200 flex items-center gap-2"
        title={current.label}
      >
        <Globe className="w-4 h-4 shrink-0" />
        <span className="text-xs font-medium">{current.label}</span>
        <ChevronDown className={`w-3 h-3 text-[#64748B] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-50 w-44 bg-[#111827] border border-[#1F2937]/80 rounded-xl shadow-2xl py-1.5 overflow-hidden">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => { setLanguage(lang.code); setOpen(false); }}
                className={`w-full text-start px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors duration-150 ${
                  currentLang === lang.code
                    ? "bg-[#6366F1]/10 text-[#6366F1] font-semibold"
                    : "text-[#94A3B8] hover:text-white hover:bg-[#1E293B]"
                }`}
              >
                <span>{lang.label}</span>
                {currentLang === lang.code && <span className="ms-auto text-[10px] text-[#6366F1]">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function ClientShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const lang = i18n.language;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, []);

  return (
    <ThemeProvider>
      <NotificationsProvider>
        <div className="flex min-h-screen bg-[#0B0F19] text-[#F8FAFC]" dir="inherit">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex-1 flex flex-col min-w-0">
            <Navbar
              onMenuClick={() => setSidebarOpen(true)}
              actions={
                <div className="flex items-center gap-1">
                  <LanguageSwitcher />
                  <ThemeToggle />
                </div>
              }
            />
            <main className="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full">
              {children}
            </main>
          </div>
        </div>
      </NotificationsProvider>
    </ThemeProvider>
  );
}
