"use client";

import { useState } from "react";
import { DATE_FILTER_OPTIONS } from "@/utils/dates";
import type { DateFilterValue } from "@/utils/dates";

interface DateFilterProps {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
}

export function DateFilter({ value, onChange }: DateFilterProps) {
  return (
    <div className="flex items-center gap-2 bg-[#111827] border border-[#1F2937] rounded-lg p-1 overflow-x-auto">
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
          {f.label}
        </button>
      ))}
    </div>
  );
}
