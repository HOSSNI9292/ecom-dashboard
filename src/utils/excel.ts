import * as XLSX from "xlsx";

export interface ExcelColumn {
  key: string;
  label: string;
}

export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns: ExcelColumn[]
): void {
  if (data.length === 0) return;
  const headerRow = columns.map((c) => c.label);
  const dataRows = data.map((item) => columns.map((c) => item[c.key] ?? ""));
  const wsData = [headerRow, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
