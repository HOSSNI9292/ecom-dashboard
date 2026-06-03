"use client";

import { LoadingSpinner } from "./ui/LoadingSpinner";
import { ErrorMessage } from "./ui/ErrorMessage";
import { ReactNode, useEffect } from "react";

interface PageWrapperProps {
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  children: ReactNode;
  hasData?: boolean;
}

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[#111827] border border-[#1F2937] rounded-xl p-5">
            <div className="h-3 skeleton rounded w-20 mb-3" />
            <div className="h-8 skeleton rounded w-28 mb-2" />
            <div className="h-3 skeleton rounded w-16" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#111827] border border-[#1F2937] rounded-xl p-5">
          <div className="h-5 skeleton rounded w-36 mb-4" />
          <div className="h-[300px] skeleton rounded" />
        </div>
        <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5">
          <div className="h-5 skeleton rounded w-36 mb-4" />
          <div className="h-[300px] skeleton rounded" />
        </div>
      </div>
    </div>
  );
}

export function PageWrapper({ loading, error, onRetry, children, hasData }: PageWrapperProps) {
  const hasContent = hasData !== undefined ? hasData : true;

  if (!hasContent && loading) {
    return <PageSkeleton />;
  }
  if (!hasContent && error) {
    return <ErrorMessage message={error.message} onRetry={onRetry} />;
  }
  return <div className="animate-fade-in">{children}</div>;
}
