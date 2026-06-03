"use client";

export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = { sm: "w-4 h-4", md: "w-8 h-8", lg: "w-12 h-12" };
  return (
    <div className="flex items-center justify-center py-24">
      <div className="relative">
        <div className={`${sizeClasses[size]} border-2 border-[#27272A] rounded-full`} />
        <div className={`${sizeClasses[size]} border-2 border-transparent border-t-[#10B981] rounded-full animate-spin absolute inset-0`} />
      </div>
    </div>
  );
}
