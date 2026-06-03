"use client";

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

function SkeletonRow({ columns }: { columns: Column<any>[] }) {
  return (
    <tr className="border-b border-[#1F2937]/50">
      {columns.map((col) => (
        <td key={col.key} className="py-3.5 px-4">
          <div className="h-4 skeleton rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyMessage = "No data found",
  onRowClick,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1F2937]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left text-[#64748B] text-xs font-semibold uppercase tracking-wider py-3.5 px-4 ${col.className || ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} columns={columns} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#1F2937] flex items-center justify-center">
          <svg className="w-6 h-6 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <p className="text-[#64748B] text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#1F2937]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`text-left text-[#64748B] text-xs font-semibold uppercase tracking-wider py-3.5 px-4 sticky top-0 bg-[#111827] z-10 ${col.className || ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick?.(item)}
              className={`border-b border-[#1F2937]/50 transition-all duration-150 ${
                onRowClick ? "cursor-pointer" : ""
              } ${
                idx % 2 === 0 ? "bg-transparent" : "bg-[#0B0F19]/30"
              } hover:bg-[#1E293B] group`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`py-3.5 px-4 text-sm text-[#94A3B8] ${col.className || ""}`}>
                  {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
