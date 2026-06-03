export const COUNTRY_NAMES: Record<string, string> = {
  GA: "Gabon",
  ML: "Mali",
  CI: "Côte d'Ivoire",
  BF: "Burkina Faso",
  NE: "Niger",
  TG: "Togo",
  BJ: "Benin",
  SN: "Sénégal",
  TD: "Chad",
  GN: "Guinea",
  CD: "Congo RDC",
  CG: "Congo Brazzaville",
};

export const COUNTRY_CURRENCIES: Record<string, string> = {
  GA: "XAF",
  ML: "XOF",
  CI: "XOF",
  BF: "XOF",
  NE: "XOF",
  TG: "XOF",
  BJ: "XOF",
  SN: "XOF",
  TD: "XAF",
  GN: "GNF",
  CD: "USD",
  CG: "XAF",
};

export const COUNTRY_FLAGS: Record<string, string> = {
  BF: "https://static.dwcdn.net/css/flag-icons/flags/4x3/bf.svg",
  NE: "https://static.dwcdn.net/css/flag-icons/flags/4x3/ne.svg",
  TG: "https://static.dwcdn.net/css/flag-icons/flags/4x3/tg.svg",
  BJ: "https://static.dwcdn.net/css/flag-icons/flags/4x3/bj.svg",
  CI: "https://static.dwcdn.net/css/flag-icons/flags/4x3/ci.svg",
  TD: "https://static.dwcdn.net/css/flag-icons/flags/4x3/td.svg",
  GA: "https://static.dwcdn.net/css/flag-icons/flags/4x3/ga.svg",
  SN: "https://static.dwcdn.net/css/flag-icons/flags/4x3/sn.svg",
  ML: "https://static.dwcdn.net/css/flag-icons/flags/4x3/ml.svg",
  GN: "https://static.dwcdn.net/css/flag-icons/flags/4x3/gn.svg",
  CD: "https://static.dwcdn.net/css/flag-icons/flags/4x3/cd.svg",
  CG: "https://static.dwcdn.net/css/flag-icons/flags/4x3/cg.svg",
};

export const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#3b82f6",
  delivered: "#10b981",
  shipped: "#14b8a6",
  shipping: "#14b8a6",
  cancelled: "#ef4444",
  returned: "#8b5cf6",
  double: "#ec4899",
  transferred: "#06b6d4",
  out_of_stock: "#6b7280",
};

export const STATUS_MAP: Record<string, string> = {
  Pending: "pending",
  pending: "pending",
  PENDING: "pending",
  Confirmed: "confirmed",
  confirmed: "confirmed",
  CONFIRMED: "confirmed",
  Delivered: "delivered",
  delivered: "delivered",
  DELIVERED: "delivered",
  Processed: "delivered",
  processed: "delivered",
  PROCESSED: "delivered",
  Shipped: "shipped",
  shipped: "shipped",
  SHIPPED: "shipped",
  Shipping: "shipped",
  shipping: "shipped",
  SHIPPING: "shipped",
  Cancelled: "cancelled",
  cancelled: "cancelled",
  CANCELLED: "cancelled",
  Returned: "returned",
  returned: "returned",
  RETURNED: "returned",
  double: "double",
  Double: "double",
  DOUBLE: "double",
  "A transférer": "transferred",
  transferred: "transferred",
  Transferred: "transferred",
  TRANSFERRED: "transferred",
  OutOfStock: "out_of_stock",
  out_of_stock: "out_of_stock",
  "Out of Stock": "out_of_stock",
  OUT_OF_STOCK: "out_of_stock",
};

export const COUNTRY_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#14b8a6",
  "#f97316",
  "#a855f7",
  "#22d3ee",
];

export const DEFAULT_API_URL = "https://api.codinafrica.com/api";

export const COUNTRY_FEES_STORAGE_KEY = "cod_dashboard_fees";

export const DEFAULT_COUNTRY_FEES: Record<string, number> = {
  GA: 8,
  ML: 7,
  CG: 8,
  CI: 7,
  BF: 7,
  TG: 7,
  NE: 7,
  BJ: 8,
  SN: 7,
  TD: 8,
  GN: 7,
  CD: 10,
};

export const OTHER_COUNTRY_FEE = 8;
