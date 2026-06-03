"use client";

import { useState, useCallback, useMemo } from "react";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { DataTable } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageWrapper } from "@/components/PageWrapper";
import { OrderModal } from "@/components/OrderModal";
import { DateFilter } from "@/components/DateFilter";
import { useOrders } from "@/hooks";
import { formatCurrency, formatDate, getImageUrlOrFallback, filterOrdersByDate } from "@/utils";
import { exportToCSV } from "@/utils/csv";
import type { Order } from "@/types";
import type { DateFilterValue } from "@/utils/dates";
import { ShoppingCart, Download, Eye, Copy, MessageCircle, Phone } from "lucide-react";

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

const perPage = 20;

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [country, setCountry] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data, loading, error, refetch, rawData } = useOrders({
    search: search || undefined,
    status: status || undefined,
    page,
    perPage,
  });

  const countries = useMemo(() => {
    if (!rawData?.orders) return [];
    const seen = new Set<string>();
    return rawData.orders.filter((o) => {
      if (seen.has(o.country)) return false;
      seen.add(o.country);
      return true;
    }).map((o) => ({ label: o.countryName || o.country, value: o.country })).sort((a, b) => a.label.localeCompare(b.label));
  }, [rawData?.orders]);

  const handleSearch = useCallback((val: string) => { setSearch(val); setPage(1); }, []);
  const handleStatus = useCallback((val: string) => { setStatus(val); setPage(1); }, []);
  const handleCountry = useCallback((val: string) => { setCountry(val); setPage(1); }, []);

  const filtered = useMemo(() => {
    if (!rawData?.orders) return [];
    let list = filterOrdersByDate(rawData.orders, dateFilter);
    if (country) list = list.filter((o) => o.country === country);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((o) =>
        o.customerName.toLowerCase().includes(s) ||
        o.phone.includes(s) ||
        o.orderId.toLowerCase().includes(s) ||
        o.productName.toLowerCase().includes(s)
      );
    }
    if (status) list = list.filter((o) => o.status === status);
    return list;
  }, [rawData?.orders, country, search, status, dateFilter]);

  const paged = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / perPage);

  const handleExport = useCallback(() => {
    exportToCSV(
      filtered.map((o) => ({
        orderId: o.orderId,
        customerName: o.customerName,
        phone: o.phone,
        country: o.countryName || o.country,
        productName: o.productName,
        amount: o.amount,
        status: o.status,
        date: o.date?.substring(0, 10),
      })),
      "orders_export",
      { orderId: "Order ID", customerName: "Customer", phone: "Phone", country: "Country", productName: "Product", amount: "Amount (XOF)", status: "Status", date: "Date" }
    );
  }, [filtered]);

  const handleCopyPhone = (e: React.MouseEvent, phone: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
  };

  const columns = [
    {
      key: "orderId",
      header: "Order",
      render: (o: Order) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#06B6D4]/5">
            <ShoppingCart className="w-4 h-4 text-[#22D3EE]" />
          </div>
          <span className="text-white font-mono text-xs">{o.orderId.substring(0, 12)}...</span>
        </div>
      ),
    },
    {
      key: "customerName",
      header: "Customer",
      render: (o: Order) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#06B6D4]/20 to-[#0891B2]/20 flex items-center justify-center text-[10px] font-bold text-[#22D3EE] shrink-0">
            {o.customerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-white text-sm font-medium leading-tight">{o.customerName}</p>
            <div className="flex items-center gap-1">
              <span className="text-[#606060] text-xs">{o.phone}</span>
              <button
                onClick={(e) => handleCopyPhone(e, o.phone)}
                className="text-[#404040] hover:text-[#22D3EE] transition-colors duration-200"
                title="Copy phone"
              >
                <Copy className="w-3 h-3" />
              </button>
              <a
                href={`https://wa.me/${o.phone.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[#404040] hover:text-[#25D366] transition-colors duration-200"
                title="WhatsApp"
              >
                <MessageCircle className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "countryName",
      header: "Country",
      render: (o: Order) => <span className="text-[#c0c0c0]">{o.countryName || o.country}</span>,
    },
    {
      key: "productName",
      header: "Product",
      render: (o: Order) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#1F1F1F] flex items-center justify-center shrink-0 overflow-hidden">
            {o.productImage ? (
              <img 
                src={getImageUrlOrFallback(o.productImage)} 
                alt={o.productName} 
                className="w-full h-full object-cover" 
                loading="lazy"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#606060" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`;
                }}
              />
            ) : (
              <ShoppingCart className="w-4 h-4 text-[#606060]" />
            )}
          </div>
          <div>
            <p className="text-white text-sm">{o.productName}</p>
            {o.productCode && <p className="text-[#606060] text-xs">{o.productCode}</p>}
          </div>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (o: Order) => <span className="text-white font-semibold">{formatCurrency(o.amount)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (o: Order) => <StatusBadge status={o.status} color={o.statusColor} />,
    },
    {
      key: "date",
      header: "Date",
      render: (o: Order) => <span className="text-[#606060] text-sm">{formatDate(o.date)}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (o: Order) => (
        <button
          onClick={() => setSelectedOrder(o)}
          className="p-2 rounded-lg text-[#606060] hover:text-white hover:bg-[#1F1F1F] transition-all duration-200 opacity-0 group-hover:opacity-100"
          title="View details"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <PageWrapper loading={loading && !rawData?.orders?.length} error={error} onRetry={refetch} hasData={!!rawData?.orders?.length}>
      <div className="space-y-4">
        <DateFilter value={dateFilter} onChange={setDateFilter} />
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-start">
          <div className="flex-1 min-w-[200px]">
            <SearchInput value={search} onChange={handleSearch} placeholder="Search orders..." />
          </div>
          <Select value={status} onChange={handleStatus} options={statusOptions} placeholder="Status" className="w-full sm:w-36" />
          <Select value={country} onChange={handleCountry} options={[{ label: "All Countries", value: "" }, ...countries]} placeholder="Country" className="w-full sm:w-40" />
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#111111] border border-[#1F1F1F] hover:border-[#06B6D4]/30 text-white rounded-lg transition-all duration-200 text-sm hover:bg-[#1A1A1A]"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        <div className="bg-[#111111] border border-[#1F1F1F] rounded-xl overflow-hidden">
          <DataTable columns={columns} data={paged} keyExtractor={(o: Order) => o.id} loading={loading && !rawData?.orders?.length} emptyMessage={`${filtered.length === 0 && rawData?.orders?.length ? "No orders match filters" : "No orders found"}`} />
        </div>

        {totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        )}

        {rawData && (
          <p className="text-[#404040] text-xs text-center">
            Showing {paged.length} of {filtered.length} orders
            {filtered.length < rawData.orders.length && ` (filtered from ${rawData.orders.length})`}
          </p>
        )}
      </div>

      <OrderModal order={selectedOrder} open={!!selectedOrder} onClose={() => setSelectedOrder(null)} />
    </PageWrapper>
  );
}
