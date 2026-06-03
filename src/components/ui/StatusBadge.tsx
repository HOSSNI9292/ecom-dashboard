"use client";

import { STATUS_COLORS } from "@/utils";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  delivered: "Delivered",
  shipped: "Shipped",
  shipping: "Shipped",
  cancelled: "Cancelled",
  returned: "Returned",
  double: "Double",
  transferred: "A transférer",
  out_of_stock: "Out of Stock",
  unreached: "Unreached",
};

interface StatusBadgeProps {
  status: string;
  color?: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, color, size = "sm" }: StatusBadgeProps) {
  const resolvedColor = color || STATUS_COLORS[status] || "#808080";
  const label = STATUS_LABELS[status] || status;
  const isSmall = size === "sm";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${
        isSmall ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      }`}
      style={{
        backgroundColor: `${resolvedColor}15`,
        color: resolvedColor,
        border: `1px solid ${resolvedColor}25`,
      }}
    >
      <span className={`rounded-full ${isSmall ? "w-1.5 h-1.5" : "w-2 h-2"}`} style={{ backgroundColor: resolvedColor }} />
      {label}
    </span>
  );
}
