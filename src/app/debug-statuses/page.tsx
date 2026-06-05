"use client";
import { useEffect, useState } from "react";

const TIMEZONES = ["UTC", "Europe/Paris", "Africa/Libreville", "Africa/Casablanca", "Africa/Lagos", "Africa/Tunis"];
const DATE_FIELDS = ["createdAt", "date", "updatedAt"];

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

        // Status breakdown by createdAt UTC (baseline)
        const todayOrders = all.filter((o: any) => (o.createdAt || "").substring(0, 10) === today);
        const statuses: Record<string, number> = {};
        for (const o of todayOrders) {
          const s = o.status?.name || "unknown";
          statuses[s] = (statuses[s] || 0) + 1;
        }

        // Date field + timezone table
        const dateTzRows: { field: string; tz: string; count: number }[] = [];
        for (const field of DATE_FIELDS) {
          for (const tz of TIMEZONES) {
            let count: number;
            if (tz === "UTC") {
              count = all.filter((o: any) => (o[field] || "").substring(0, 10) === today).length;
            } else {
              count = all.filter((o: any) => {
                const val = o[field];
                if (!val) return false;
                try {
                  const d = new Date(val);
                  const local = d.toLocaleDateString("en-CA", { timeZone: tz });
                  return local === today;
                } catch { return false; }
              }).length;
            }
            dateTzRows.push({ field, tz, count });
          }
        }

        // Show all orders grouped by date-field + timezone to see which ones shift
        const shiftedOrders: any[] = [];
        for (const o of all) {
          const createdAtUTC = (o.createdAt || "").substring(0, 10);
          let createdAtParis = "";
          let createdAtLibreville = "";
          let createdAtCasablanca = "";
          try {
            const d = new Date(o.createdAt);
            createdAtParis = d.toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
            createdAtLibreville = d.toLocaleDateString("en-CA", { timeZone: "Africa/Libreville" });
            createdAtCasablanca = d.toLocaleDateString("en-CA", { timeZone: "Africa/Casablanca" });
          } catch {}
          if (createdAtUTC !== today && (createdAtParis === today || createdAtLibreville === today || createdAtCasablanca === today)) {
            shiftedOrders.push({ id: o.id, status: o.status?.name, createdAt: o.createdAt, utc: createdAtUTC, paris: createdAtParis, libreville: createdAtLibreville, casablanca: createdAtCasablanca });
          }
        }

        // Also check date field
        const dateShifted: any[] = [];
        for (const o of all) {
          const dateUTC = (o.date || "").substring(0, 10);
          let dateParis = "";
          try {
            const d = new Date(o.date);
            dateParis = d.toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
          } catch {}
          if (dateUTC !== today && dateParis === today) {
            dateShifted.push({ id: o.id, status: o.status?.name, date: o.date, utc: dateUTC, paris: dateParis });
          }
        }

        // Sample order date fields
        const sample = all.slice(0, 5).map((o: any) => ({
          id: o.id,
          status: o.status?.name,
          createdAt: o.createdAt,
          date: o.date,
          updatedAt: o.updatedAt,
        }));

        setData({
          totalByCreatedAtUTC: todayOrders.length,
          statuses,
          dateTzRows,
          shiftedOrders,
          dateShifted,
          sample,
          allCount: all.length,
          today,
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
    <div className="p-8 text-white max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Date Field + Timezone Investigation</h1>
      <p>Server date (UTC): <strong>{data.today}</strong> | Total API orders: <strong>{data.allCount}</strong></p>

      <div>
        <h2 className="text-xl font-semibold mb-2">Current: createdAt UTC = {data.totalByCreatedAtUTC} orders</h2>
        <p>COD Africa shows 56 orders for Today.</p>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Date Field + Timezone | Count</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-2 px-3">Field</th>
              <th className="text-left py-2 px-3">Timezone</th>
              <th className="text-right py-2 px-3">Count</th>
              <th className="text-right py-2 px-3">Match COD Africa (56)?</th>
            </tr>
          </thead>
          <tbody>
            {data.dateTzRows.map((r: any, i: number) => (
              <tr key={i} className={`border-b border-gray-800 ${r.count === 56 ? "bg-green-900/30" : ""}`}>
                <td className="py-2 px-3">{r.field}</td>
                <td className="py-2 px-3">{r.tz}</td>
                <td className="text-right py-2 px-3 font-mono">{r.count}</td>
                <td className="text-right py-2 px-3">{r.count === 56 ? "✅ MATCH" : r.count > 56 ? "⚠️ Over" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.shiftedOrders.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Orders Shifting INTO today by timezone (not in UTC createdAt today)</h2>
          <p>These orders have createdAt that falls on today in a non-UTC timezone.</p>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 px-3">ID</th>
                <th className="text-left py-2 px-3">Status</th>
                <th className="text-left py-2 px-3">createdAt</th>
                <th className="text-right py-2 px-3">UTC</th>
                <th className="text-right py-2 px-3">Paris</th>
                <th className="text-right py-2 px-3">Libreville</th>
                <th className="text-right py-2 px-3">Casablanca</th>
              </tr>
            </thead>
            <tbody>
              {data.shiftedOrders.map((o: any, i: number) => (
                <tr key={i} className="border-b border-gray-800">
                  <td className="py-2 px-3">{o.id}</td>
                  <td className="py-2 px-3">{o.status}</td>
                  <td className="py-2 px-3 text-xs">{o.createdAt}</td>
                  <td className="text-right py-2 px-3">{o.utc}</td>
                  <td className="text-right py-2 px-3">{o.paris}</td>
                  <td className="text-right py-2 px-3">{o.libreville}</td>
                  <td className="text-right py-2 px-3">{o.casablanca}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.dateShifted.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Orders shifting INTO today by `date` field in Paris timezone</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 px-3">ID</th>
                <th className="text-left py-2 px-3">Status</th>
                <th className="text-left py-2 px-3">date</th>
                <th className="text-right py-2 px-3">UTC</th>
                <th className="text-right py-2 px-3">Paris</th>
              </tr>
            </thead>
            <tbody>
              {data.dateShifted.map((o: any, i: number) => (
                <tr key={i} className="border-b border-gray-800">
                  <td className="py-2 px-3">{o.id}</td>
                  <td className="py-2 px-3">{o.status}</td>
                  <td className="py-2 px-3 text-xs">{o.date}</td>
                  <td className="text-right py-2 px-3">{o.utc}</td>
                  <td className="text-right py-2 px-3">{o.paris}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-2">Sample Orders (date fields)</h2>
        <pre className="bg-gray-900 p-4 rounded text-xs overflow-x-auto">{JSON.stringify(data.sample, null, 2)}</pre>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Status Breakdown (by createdAt UTC)</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-2 px-3">Status</th>
              <th className="text-right py-2 px-3">Count</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(data.statuses as Record<string, number>)
              .sort(([, a], [, b]) => b - a)
              .map(([s, c]) => (
                <tr key={s} className="border-b border-gray-800">
                  <td className="py-2 px-3">{s}</td>
                  <td className="text-right py-2 px-3">{c}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
