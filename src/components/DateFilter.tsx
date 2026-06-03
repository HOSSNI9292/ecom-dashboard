"use client";

import { DATE_FILTER_OPTIONS } from "@/utils/dates";
import type { DateFilterValue } from "@/utils/dates";

interface DateFilterProps {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
}

export function DateFilter({ value, onChange }: DateFilterProps) {
  return (
    <div className="flex items-center gap-1.5 bg-[#141417] border border-[#27272A] rounded-xl p-1 overflow-x-auto">
      {DATE_FILTER_OPTIONS.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 ${
            value === f.value
              ? "bg-[#10B981] text-white shadow-lg shadow-[#10B981]/20"
              : "text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#27272A]"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
