"use client";

import { useState, useCallback, useMemo } from "react";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { DataTable } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageWrapper } from "@/components/PageWrapper";
import { useOrders } from "@/hooks";
import { formatCurrency, formatDate } from "@/utils";
import type { Order } from "@/types";
import { ShoppingCart } from "lucide-react";

const statusOptions = [
  { label: "All Status", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Double", value: "double" },
  { label: "Transferred", value: "transferred" },
  { label: "Out of Stock", value: "out_of_stock" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Delivered", value: "delivered" },
];

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const { data, loading, error, refetch } = useOrders({
    search: search || undefined,
    status: status || undefined,
    page,
    perPage: 20,
  });

  const handleSearch = useCallback((val: string) => { setSearch(val); setPage(1); }, []);
  const handleStatus = useCallback((val: string) => { setStatus(val); setPage(1); }, []);

  const columns = [
    {
      key: "orderId",
      header: "Order ID",
      render: (o: Order) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent-500/10 rounded-lg"><ShoppingCart className="w-4 h-4 text-accent-400" /></div>
          <span className="text-white font-mono text-xs">{o.orderId}</span>
        </div>
      ),
    },
    {
      key: "customerName",
      header: "Customer",
      render: (o: Order) => (
        <div>
          <p className="text-white font-medium">{o.customerName}</p>
          <p className="text-dark-400 text-xs">{o.phone}</p>
        </div>
      ),
    },
    {
      key: "countryName",
      header: "Country",
      render: (o: Order) => <span className="text-dark-200">{o.countryName || o.country}</span>,
    },
    {
      key: "productName",
      header: "Product",
      render: (o: Order) => (
        <div>
          <p className="text-white text-sm">{o.productName}</p>
          <p className="text-dark-400 text-xs">{o.productCode}</p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (o: Order) => <span className="text-white font-medium">{formatCurrency(o.amount)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (o: Order) => <StatusBadge status={o.status} color={o.statusColor} />,
    },
    {
      key: "date",
      header: "Date",
      render: (o: Order) => <span className="text-dark-300 text-sm">{formatDate(o.date)}</span>,
    },
  ];

  return (
    <PageWrapper loading={loading && !data} error={error} onRetry={refetch}>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchInput value={search} onChange={handleSearch} placeholder="Search by customer, phone, order ID..." />
          </div>
          <Select value={status} onChange={handleStatus} options={statusOptions} placeholder="Status" className="w-full sm:w-40" />
        </div>

        <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
          <DataTable columns={columns} data={data?.orders ?? []} keyExtractor={(o: Order) => o.id} loading={loading} emptyMessage="No orders found" />
        </div>

        {data?.totalPages && data.totalPages > 1 && (
          <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
        )}
      </div>
    </PageWrapper>
  );
}
