"use client";
import { useEffect, useState } from "react";

export default function DebugStatusesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { api } = await import("@/services/api");
        const all = await api.fetchAllOrders();
        const today = new Date().toISOString().substring(0, 10);
        const todayOrders = all.filter((o: any) => (o.createdAt || "").substring(0, 10) === today);
        const statuses: Record<string, number> = {};
        for (const o of todayOrders) {
          const s = o.status?.name || "unknown";
          statuses[s] = (statuses[s] || 0) + 1;
        }
        const rawStatuses: Record<string, number> = {};
        for (const o of todayOrders) {
          const s = o.status?.name || "unknown";
          const r = o.status?._id || "unknown";
          rawStatuses[`${s} (${r})`] = (rawStatuses[`${s} (${r})`] || 0) + 1;
        }
        setData({ total: todayOrders.length, statuses, rawStatuses, sample: todayOrders.slice(0, 3).map((o: any) => ({ id: o.id, status: o.status?.name, statusId: o.status?._id, createdAt: o.createdAt })) });
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
    <div className="p-8 text-white max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Order Status Breakdown (Today by createdAt)</h1>
      <p className="mb-4">Total orders today: <strong>{data.total}</strong></p>

      <h2 className="text-xl font-semibold mb-2">Status | Count</h2>
      <table className="w-full mb-8 border-collapse">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left py-2 px-3">Status</th>
            <th className="text-right py-2 px-3">Count</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(data.statuses as Record<string, number>)
            .sort(([, a], [, b]) => b - a)
            .map(([status, count]) => (
              <tr key={status} className="border-b border-gray-800">
                <td className="py-2 px-3">{status}</td>
                <td className="text-right py-2 px-3">{count}</td>
              </tr>
            ))}
        </tbody>
      </table>

      <h2 className="text-xl font-semibold mb-2">Raw Status (with ID) | Count</h2>
      <table className="w-full mb-8 border-collapse">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left py-2 px-3">Status (ID)</th>
            <th className="text-right py-2 px-3">Count</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(data.rawStatuses as Record<string, number>)
            .sort(([, a], [, b]) => b - a)
            .map(([status, count]) => (
              <tr key={status} className="border-b border-gray-800">
                <td className="py-2 px-3">{status}</td>
                <td className="text-right py-2 px-3">{count}</td>
              </tr>
            ))}
        </tbody>
      </table>

      <h2 className="text-xl font-semibold mb-2">Sample Orders</h2>
      <pre className="bg-gray-900 p-4 rounded text-xs overflow-x-auto">{JSON.stringify(data.sample, null, 2)}</pre>
    </div>
  );
}
