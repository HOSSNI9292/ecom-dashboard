export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columnMap: Record<string, string>
): void {
  if (data.length === 0) return;
  const headers = Object.keys(columnMap);
  const headerRow = headers.map((h) => columnMap[h]).join(",");
  const rows = data.map((item) =>
    headers.map((h) => {
      const val = item[h];
      const str = val == null ? "" : String(val);
      return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(",")
  );
  const csv = [headerRow, ...rows].join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
