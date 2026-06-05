export type DateFilterValue = "today" | "yesterday" | "7d" | "30d" | "thisMonth" | "thisYear" | "all";

export const DATE_FILTER_OPTIONS: { label: string; value: DateFilterValue }[] = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "This Month", value: "thisMonth" },
  { label: "This Year", value: "thisYear" },
  { label: "All", value: "all" },
];

export const DATE_FILTER_LABELS: Record<DateFilterValue, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  thisMonth: "This Month",
  thisYear: "This Year",
  all: "All Time",
};

const TIMEZONE = "Europe/Paris";

export function toParisDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr.substring(0, 10);
    return d.toLocaleDateString("en-CA", { timeZone: TIMEZONE });
  } catch {
    return dateStr.substring(0, 10);
  }
}

export function filterOrdersByDate<T extends { date?: string }>(orders: T[], filter: DateFilterValue): T[] {
  const now = new Date();
  const today = now.toLocaleDateString("en-CA", { timeZone: TIMEZONE });
  const yesterday = new Date(now.getTime() - 86400000).toLocaleDateString("en-CA", { timeZone: TIMEZONE });
  const d7 = new Date(now.getTime() - 7 * 86400000).toLocaleDateString("en-CA", { timeZone: TIMEZONE });
  const d30 = new Date(now.getTime() - 30 * 86400000).toLocaleDateString("en-CA", { timeZone: TIMEZONE });
  const todayParis = now.toLocaleDateString("en-CA", { timeZone: TIMEZONE });
  const [y, m] = todayParis.split("-").map(Number);
  const thisMonthStart = `${y}-${String(m).padStart(2, "0")}-01`;
  const thisYearStart = `${y}-01-01`;

  return orders.filter((o) => {
    const d = toParisDate(o.date);
    if (!d) return false;
    if (filter === "today") return d === today;
    if (filter === "yesterday") return d === yesterday;
    if (filter === "7d") return d >= d7;
    if (filter === "30d") return d >= d30;
    if (filter === "thisMonth") return d >= thisMonthStart;
    if (filter === "thisYear") return d >= thisYearStart;
    return true;
  });
}
