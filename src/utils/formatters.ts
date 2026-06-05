export function formatCurrency(amount: number, currency?: string): string {
  if (currency) {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    } catch {
      return `${new Intl.NumberFormat("en-US").format(Math.round(amount * 100) / 100)} ${currency.toUpperCase()}`;
    }
  }
  return `${new Intl.NumberFormat("en-US").format(Math.round(amount))} XOF`;
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return formatNumber(num);
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.substring(0, length) + "..." : str;
}
