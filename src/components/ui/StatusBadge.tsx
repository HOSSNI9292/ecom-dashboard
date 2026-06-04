"use client";

import { useTranslation } from "react-i18next";
import { STATUS_COLORS } from "@/utils";

const STATUS_KEYS: Record<string, string> = {
  pending: "status.pending",
  confirmed: "status.confirmed",
  delivered: "status.delivered",
  shipped: "status.delivered",
  shipping: "status.delivered",
  cancelled: "status.cancelled",
  returned: "status.returned",
  double: "status.double",
  transferred: "status.transferred",
  out_of_stock: "status.outOfStock",
  unreached: "status.unreached",
};

interface StatusBadgeProps {
  status: string;
  color?: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, color, size = "sm" }: StatusBadgeProps) {
  const { t } = useTranslation();
  const resolvedColor = color || STATUS_COLORS[status] || "#94A3B8";
  const labelKey = STATUS_KEYS[status];
  const label = labelKey ? t(labelKey) : status;
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
