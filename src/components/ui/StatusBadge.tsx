"use client";

import { STATUS_COLORS } from "@/utils";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  delivered: "Delivered",
  cancelled: "Cancelled",
  double: "Double",
  transferred: "A transférer",
  out_of_stock: "Out of Stock",
};

interface StatusBadgeProps {
  status: string;
  color?: string;
}

export function StatusBadge({ status, color }: StatusBadgeProps) {
  const resolvedColor = color || STATUS_COLORS[status] || "#808080";
  const label = STATUS_LABELS[status] || status;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{
        backgroundColor: `${resolvedColor}20`,
        color: resolvedColor,
        border: `1px solid ${resolvedColor}40`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: resolvedColor }} />
      {label}
    </span>
  );
}
