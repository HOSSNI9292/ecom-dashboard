"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="p-2 rounded-xl text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#27272A] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {start > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className="w-8 h-8 rounded-xl text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#27272A] text-sm transition-all duration-200"
          >
            1
          </button>
          {start > 2 && <span className="text-[#3F3F46] px-1 select-none">...</span>}
        </>
      )}
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`w-8 h-8 rounded-xl text-sm font-medium transition-all duration-200 ${
            p === page
              ? "bg-[#10B981] text-white shadow-lg shadow-[#10B981]/20"
              : "text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#27272A]"
          }`}
        >
          {p}
        </button>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="text-[#3F3F46] px-1 select-none">...</span>}
          <button
            onClick={() => onPageChange(totalPages)}
            className="w-8 h-8 rounded-xl text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#27272A] text-sm transition-all duration-200"
          >
            {totalPages}
          </button>
        </>
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="p-2 rounded-xl text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#27272A] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
