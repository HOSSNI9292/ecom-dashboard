"use client";

import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

export function Select({ value, onChange, options, placeholder, className = "" }: SelectProps) {
  const { t } = useTranslation();
  return (
    <div className={`relative group ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-[#111827] border border-[#1F2937] rounded-lg text-white pl-3 pr-10 py-2.5 focus:outline-none focus:border-[#6366F1]/50 focus:ring-1 focus:ring-[#6366F1]/20 transition-all duration-200 text-sm cursor-pointer"
      >
        <option value="" disabled>{placeholder ?? t("common.select")}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] pointer-events-none group-focus-within:text-[#6366F1] transition-colors duration-200" />
    </div>
  );
}
