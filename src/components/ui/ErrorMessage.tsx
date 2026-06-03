"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#EF4444]/10 flex items-center justify-center mb-6">
        <AlertTriangle className="w-8 h-8 text-[#EF4444]" />
      </div>
      <p className="text-[#FAFAFA] text-lg font-semibold mb-2">Something went wrong</p>
      <p className="text-[#71717A] text-sm mb-8 max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl transition-all duration-200 text-sm font-medium shadow-lg shadow-[#10B981]/20 hover:shadow-[#10B981]/30"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      )}
    </div>
  );
}
