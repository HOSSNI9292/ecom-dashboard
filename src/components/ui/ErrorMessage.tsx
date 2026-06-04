"use client";

import { useTranslation } from "react-i18next";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#ef4444]/10 flex items-center justify-center mb-6">
        <AlertTriangle className="w-8 h-8 text-[#ef4444]" />
      </div>
      <p className="text-white text-lg font-semibold mb-2">{t("common.error")}</p>
      <p className="text-[#64748B] text-sm mb-8 max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded-lg transition-all duration-200 text-sm font-medium shadow-[0_0_16px_rgba(99,102,241,0.2)] hover:shadow-[0_0_24px_rgba(99,102,241,0.3)]"
        >
          <RefreshCw className="w-4 h-4" />
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}
