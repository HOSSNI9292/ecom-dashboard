"use client";

import { LoadingSpinner } from "./ui/LoadingSpinner";
import { ErrorMessage } from "./ui/ErrorMessage";

interface PageWrapperProps {
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  children: React.ReactNode;
}

export function PageWrapper({ loading, error, onRetry, children }: PageWrapperProps) {
  if (loading && !children) {
    return <LoadingSpinner size="lg" />;
  }
  if (error) {
    return <ErrorMessage message={error.message} onRetry={onRetry} />;
  }
  return <>{children}</>;
}
