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

export function filterOrdersByDate<T extends { date?: string }>(orders: T[], filter: DateFilterValue): T[] {
  const now = new Date();
  const today = now.toISOString().substring(0, 10);
  const yesterday = new Date(now.getTime() - 86400000).toISOString().substring(0, 10);
  const d7 = new Date(now.getTime() - 7 * 86400000).toISOString();
  const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thisYearStart = new Date(now.getFullYear(), 0, 1).toISOString();

  return orders.filter((o) => {
    const d = o.date;
    if (!d) return false;
    if (filter === "today") return d.startsWith(today);
    if (filter === "yesterday") return d.startsWith(yesterday);
    if (filter === "7d") return d >= d7;
    if (filter === "30d") return d >= d30;
    if (filter === "thisMonth") return d >= thisMonthStart;
    if (filter === "thisYear") return d >= thisYearStart;
    return true;
  });
}
