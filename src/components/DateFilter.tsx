"use client";

import { useTranslation } from "react-i18next";
import { DATE_FILTER_OPTIONS } from "@/utils/dates";
import type { DateFilterValue } from "@/utils/dates";

interface DateFilterProps {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
}

export function DateFilter({ value, onChange }: DateFilterProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 bg-[#111827] border border-[#1F2937]/80 rounded-lg p-1 overflow-x-auto">
      {DATE_FILTER_OPTIONS.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all duration-200 ${
            value === f.value
              ? "bg-[#6366F1] text-white shadow-[0_0_12px_rgba(99,102,241,0.3)]"
              : "text-[#64748B] hover:text-white"
          }`}
        >
          {t(`dateFilter.${f.value}`)}
        </button>
      ))}
    </div>
  );
}
