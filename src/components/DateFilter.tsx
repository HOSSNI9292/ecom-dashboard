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
    <div className="flex items-center gap-2 bg-[#111111] border border-[#1F1F1F] rounded-lg p-1 overflow-x-auto">
      {DATE_FILTER_OPTIONS.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all duration-200 ${
            value === f.value
              ? "bg-[#06B6D4] text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]"
              : "text-[#606060] hover:text-white"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
