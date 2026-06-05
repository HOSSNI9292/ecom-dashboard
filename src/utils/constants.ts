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
  pending: "#F59E0B",
  confirmed: "#10B981",
  delivered: "#10B981",
  shipped: "#8B5CF6",
  shipping: "#8B5CF6",
  cancelled: "#EF4444",
  returned: "#8B5CF6",
  double: "#8B5CF6",
  transferred: "#8B5CF6",
  out_of_stock: "#64748B",
  unreached: "#94A3B8",
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
  Livré: "delivered",
  livré: "delivered",
  LIVRÉ: "delivered",
  Livre: "delivered",
  livre: "delivered",
  LIVRE: "delivered",
  Processed: "confirmed",
  processed: "confirmed",
  PROCESSED: "confirmed",
  Payé: "confirmed",
  payé: "confirmed",
  PAYÉ: "confirmed",
  Shipped: "shipped",
  shipped: "shipped",
  SHIPPED: "shipped",
  Shipping: "shipping",
  shipping: "shipping",
  SHIPPING: "shipping",
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
  Unreached: "unreached",
  unreached: "unreached",
  UNREACHED: "unreached",
  Spam: "cancelled",
  spam: "cancelled",
  SPAM: "cancelled",
};

export const COUNTRY_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#8b5cf6",
  "#ec4899",
  "#84cc16",
  "#a78bfa",
  "#f97316",
  "#f472b6",
  "#2dd4bf",
];

export const DEFAULT_API_URL = "https://api.codinafrica.com/api";

export const COUNTRY_FEES_STORAGE_KEY = "cod_dashboard_fees";

export const FIXED_COUNTRY_FEES: Record<string, number> = {
  GA: 6500,
  CG: 5000,
  CI: 5000,
  ML: 5000,
  BF: 5000,
  NE: 5000,
  TD: 5000,
  BJ: 5000,
  TG: 5000,
};

export const DEFAULT_FIXED_FEE = 5000;

export const XOF_TO_USD_RATE = 600;
