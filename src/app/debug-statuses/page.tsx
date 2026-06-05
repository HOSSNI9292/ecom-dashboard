"use client";
import { useEffect, useState } from "react";
import { STATUS_MAP } from "@/utils/constants";

export default function DebugStatusesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { api } = await import("@/services/api");
        const all = await api.fetchAllOrders();
        const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });

        // Today orders by createdAt + Europe/Paris
        const todayOrders = all.filter((o: any) => {
          if (!o.createdAt) return false;
          try {
            return new Date(o.createdAt).toLocaleDateString("en-CA", { timeZone: "Europe/Paris" }) === today;
          } catch { return false; }
        });

        // Group by raw status name
        const byStatus: Record<string, any[]> = {};
        for (const o of todayOrders) {
          const s = o.status?.name || "unknown";
          if (!byStatus[s]) byStatus[s] = [];
          byStatus[s].push(o);
        }

        // For each status, show the mapped value and count
        const statusSummary = Object.entries(byStatus).map(([name, orders]) => ({
          name,
          mapped: STATUS_MAP[name] || name.toLowerCase(),
          count: orders.length,
          orders: orders.map((o: any) => ({
            id: o.id || o._id,
            statusName: o.status?.name,
            statusId: o.status?._id,
            createdAt: o.createdAt,
            createdAtParis: new Date(o.createdAt).toLocaleDateString("en-CA", { timeZone: "Europe/Paris" }),
            customer: o.customer?.fullName,
            phone: o.customer?.phone,
            country: o.customer?.country,
            city: o.customer?.city,
            totalPrice: o.totalPrice,
            source: o.source,
          })),
        }));

        // Simulate what our dashboard counts
        const dashboardConfirmed = todayOrders.filter((o: any) => {
          const raw = o.status?.name || "unknown";
          const mapped = STATUS_MAP[raw] || raw.toLowerCase();
          return ["confirmed", "processed", "delivered", "shipping", "shipped"].includes(mapped);
        }).length;

        // If COD Africa says 25, check what 9 extra are
        const dashboardNotConfirmed = todayOrders.filter((o: any) => {
          const raw = o.status?.name || "unknown";
          const mapped = STATUS_MAP[raw] || raw.toLowerCase();
          return !["confirmed", "processed", "delivered", "shipping", "shipped"].includes(mapped);
        });

        setData({
          today,
          total: todayOrders.length,
          dashboardConfirmed,
          codAfricaConfirmed: 25,
          gap: 25 - dashboardConfirmed,
          statusSummary,
          dashboardNotConfirmed: dashboardNotConfirmed.map((o: any) => ({
            id: o.id || o._id,
            statusName: o.status?.name,
            mapped: STATUS_MAP[o.status?.name || "unknown"] || (o.status?.name || "unknown").toLowerCase(),
            createdAt: o.createdAt,
          })),
        });
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-8 text-white">Loading...</div>;
  if (error) return <div className="p-8 text-red-400">Error: {error}</div>;
  if (!data) return <div className="p-8 text-white">No data</div>;

  return (
    <div className="p-8 text-white max-w-6xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">COD Africa Confirmed Orders Investigation</h1>
      <p>Date (Europe/Paris): <strong>{data.today}</strong></p>
      <p>API orders today: <strong>{data.total}</strong> | Dashboard Confirmed: <strong>{data.dashboardConfirmed}</strong></p>
      <p>COD Africa UI Confirmed: <strong>{data.codAfricaConfirmed}</strong> | Gap: <strong>{data.gap} orders</strong></p>

      <div>
        <h2 className="text-xl font-semibold mb-2">Status Summary</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-2 px-3">Raw Status</th>
              <th className="text-left py-2 px-3">Mapped To</th>
              <th className="text-right py-2 px-3">Count</th>
              <th className="text-center py-2 px-3">In Dashboard Confirmed?</th>
            </tr>
          </thead>
          <tbody>
            {data.statusSummary.map((s: any) => {
              const isConfirmed = ["confirmed", "processed", "delivered", "shipping", "shipped"].includes(s.mapped);
              return (
                <tr key={s.name} className={`border-b border-gray-800 ${isConfirmed ? "bg-green-900/20" : ""}`}>
                  <td className="py-2 px-3">{s.name}</td>
                  <td className="py-2 px-3">{s.mapped}</td>
                  <td className="text-right py-2 px-3 font-mono">{s.count}</td>
                  <td className="text-center py-2 px-3">{isConfirmed ? "✅" : "❌"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">All Orders Not in Dashboard Confirmed</h2>
        <p className="text-sm text-gray-400 mb-2">These {data.dashboardNotConfirmed.length} orders are NOT counted as Confirmed by the dashboard. Compare with COD Africa UI to identify which 9 should be.</p>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-2 px-2">ID</th>
              <th className="text-left py-2 px-2">Raw Status</th>
              <th className="text-left py-2 px-2">Mapped</th>
              <th className="text-left py-2 px-2">createdAt (Paris)</th>
            </tr>
          </thead>
          <tbody>
            {data.dashboardNotConfirmed.map((o: any) => {
              const parisDate = new Date(o.createdAt).toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
              const parisTime = new Date(o.createdAt).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris" });
              return (
                <tr key={o.id} className="border-b border-gray-800">
                  <td className="py-1 px-2 font-mono">{o.id}</td>
                  <td className="py-1 px-2">{o.statusName}</td>
                  <td className="py-1 px-2">{o.mapped}</td>
                  <td className="py-1 px-2">{parisDate} {parisTime}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">All Orders Today — Detailed Listing</h2>
        <p className="text-sm text-gray-400 mb-2">Compare each order with COD Africa UI. Mark which ones COD Africa counts as "Confirmed".</p>
        {data.statusSummary.map((s: any) => (
          <div key={s.name} className="mb-6">
            <h3 className="text-lg font-semibold mb-1">{s.name} ({s.count} orders)</h3>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-1 px-2">Order ID</th>
                  <th className="text-left py-1 px-2">Status</th>
                  <th className="text-left py-1 px-2">Customer</th>
                  <th className="text-left py-1 px-2">Phone</th>
                  <th className="text-left py-1 px-2">Country</th>
                  <th className="text-left py-1 px-2">Amount</th>
                  <th className="text-left py-1 px-2">Source</th>
                  <th className="text-left py-1 px-2">createdAt (Paris)</th>
                </tr>
              </thead>
              <tbody>
                {s.orders.map((o: any) => (
                  <tr key={o.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="py-1 px-2 font-mono">{o.id}</td>
                    <td className="py-1 px-2">{o.statusName}</td>
                    <td className="py-1 px-2">{o.customer}</td>
                    <td className="py-1 px-2">{o.phone}</td>
                    <td className="py-1 px-2">{o.country}</td>
                    <td className="py-1 px-2">{o.totalPrice}</td>
                    <td className="py-1 px-2">{o.source}</td>
                    <td className="py-1 px-2">{new Date(o.createdAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
