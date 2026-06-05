"use client";
import { useEffect, useState } from "react";

const TARGET_FIELDS = ["statusCallCenter", "validated_status", "teleConsultantConfirm", "shippingConfirmCount", "autoConfirmed"];

function getNested(obj: any, path: string): any {
  return path.split(".").reduce((acc, part) => acc?.[part], obj);
}

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

        const todayOrders: any[] = all.filter((o: any) => {
          if (!o.createdAt) return false;
          try {
            return new Date(o.createdAt).toLocaleDateString("en-CA", { timeZone: "Europe/Paris" }) === today;
          } catch { return false; }
        });

        // Discover actual paths for target fields
        const fieldPaths: string[] = [];
        for (const target of TARGET_FIELDS) {
          let found = false;
          for (const o of todayOrders) {
            if (o[target] !== undefined) { fieldPaths.push(target); found = true; break; }
            for (const k of Object.keys(o)) {
              if (o[k] && typeof o[k] === "object" && !Array.isArray(o[k]) && o[k][target] !== undefined) {
                fieldPaths.push(`${k}.${target}`);
                found = true; break;
              }
            }
            if (found) break;
          }
          if (!found) fieldPaths.push(target); // keep for display
        }

        // Distribution for each field
        const distributions: Record<string, Record<string, number>> = {};
        const orderTable: any[] = [];

        for (const fp of fieldPaths) {
          const dist: Record<string, number> = {};
          for (const o of todayOrders) {
            const val = getNested(o, fp);
            const key = val === null ? "null" : val === undefined ? "undefined" : String(val);
            dist[key] = (dist[key] || 0) + 1;
          }
          distributions[fp] = dist;
        }

        // Test which field(s) produce 25 confirmed
        const tests: any[] = [];
        for (const fp of fieldPaths) {
          const val = getNested(todayOrders[0], fp); // check first order
          const isBool = val === true || val === false;

          if (isBool) {
            // Boolean field: count truthy
            const truthyCount = todayOrders.filter((o) => getNested(o, fp) === true).length;
            tests.push({ field: fp, type: "boolean", confirmed: truthyCount, matches25: truthyCount === 25 });
          } else {
            // String field: check unique values
            const vals = new Set(todayOrders.map((o) => String(getNested(o, fp) ?? "")));
            tests.push({ field: fp, type: "string", uniqueValues: Array.from(vals), confirmed: -1, matches25: false });
          }
        }

        // Also test combinations
        // For string fields, count non-empty, non-null, non-undefined
        for (const fp of fieldPaths) {
          const nonEmpty = todayOrders.filter((o) => {
            const v = getNested(o, fp);
            return v !== null && v !== undefined && v !== "" && v !== false;
          }).length;
          tests.push({ field: `${fp} (non-empty)`, type: "non-empty", confirmed: nonEmpty, matches25: nonEmpty === 25 });
        }

        // For string fields with specific values
        for (const fp of fieldPaths) {
          const freqs: Record<string, number> = {};
          for (const o of todayOrders) {
            const v = String(getNested(o, fp) ?? "undefined");
            freqs[v] = (freqs[v] || 0) + 1;
          }
          for (const [val, count] of Object.entries(freqs)) {
            if (count === 25) {
              tests.push({ field: `${fp} == ${val}`, type: "exact-match", confirmed: count, matches25: true });
            }
          }
        }

        // Per-order table for manual inspection
        for (const o of todayOrders) {
          const row: any = { id: o.id || o._id, statusName: o.status?.name };
          for (const fp of fieldPaths) {
            row[fp] = getNested(o, fp);
          }
          orderTable.push(row);
        }

        // Also try: status === "Confirmed" OR any of these fields being truthy
        for (const fp of fieldPaths) {
          const combined = todayOrders.filter((o: any) => {
            const raw = o.status?.name || "";
            const mapped = raw.toLowerCase() === "confirmed" || raw.toLowerCase() === "processed" || raw.toLowerCase() === "delivered" || raw.toLowerCase() === "shipped" || raw.toLowerCase() === "shipping";
            if (mapped) return true;
            const v = getNested(o, fp);
            return v === true || (typeof v === "string" && v !== "" && v !== "undefined" && v !== "null");
          }).length;
          tests.push({ field: `status_confirmed|processed|delivered|shipping|shipped OR ${fp} truthy`, type: "combined-or", confirmed: combined, matches25: combined === 25 });
        }

        // Combined: status = "Confirmed" OR autoConfirmed = true
        const confirmedStatus = todayOrders.filter((o: any) => (o.status?.name || "").toLowerCase() === "confirmed").length;
        const autoConfirmedTrue = todayOrders.filter((o: any) => getNested(o, "autoConfirmed") === true).length;

        // Auto-confirmed orders that are NOT status=Confirmed
        const extraAutoConfirmed = todayOrders.filter((o: any) => {
          const isStatusConfirmed = (o.status?.name || "").toLowerCase() === "confirmed";
          const isAutoConfirmed = getNested(o, "autoConfirmed") === true;
          return !isStatusConfirmed && isAutoConfirmed;
        });

        // teleConsultantConfirm orders that are NOT status=Confirmed
        const extraTeleConsultant = todayOrders.filter((o: any) => {
          const isStatusConfirmed = (o.status?.name || "").toLowerCase() === "confirmed";
          const isTeleConfirmed = getNested(o, "teleConsultantConfirm") === true;
          return !isStatusConfirmed && isTeleConfirmed;
        });

        // statusCallCenter orders that are NOT status=Confirmed
        const extraStatusCallCenter = todayOrders.filter((o: any) => {
          const isStatusConfirmed = (o.status?.name || "").toLowerCase() === "confirmed";
          const val = getNested(o, "statusCallCenter");
          return !isStatusConfirmed && val === true;
        });

        // validated_status orders
        const extraValidatedStatus = todayOrders.filter((o: any) => {
          const isStatusConfirmed = (o.status?.name || "").toLowerCase() === "confirmed";
          const val = getNested(o, "validated_status");
          return !isStatusConfirmed && val !== null && val !== undefined && val !== "" && val !== false;
        });

        setData({
          today, total: todayOrders.length,
          fieldPaths, distributions, tests,
          orderTable,
          confirmedStatus,
          autoConfirmedTrue,
          extraAutoConfirmed,
          extraTeleConsultant,
          extraStatusCallCenter,
          extraValidatedStatus,
          statusCounts: todayOrders.reduce((acc: any, o: any) => {
            const s = o.status?.name || "unknown";
            acc[s] = (acc[s] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
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
    <div className="p-8 text-white max-w-7xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Call-Center Field Analysis — Confirmed Orders</h1>
      <p>Date (Europe/Paris): <strong>{data.today}</strong> | Orders today: <strong>{data.total}</strong></p>
      <p>Status breakdown: {Object.entries(data.statusCounts as Record<string, number>).map(([k, v]) => `${k}=${v}`).join(", ")}</p>
      <p>COD Africa Confirmed: <strong>25</strong></p>

      <div>
        <h2 className="text-xl font-semibold mb-2">Field Distribution</h2>
        {data.fieldPaths.map((fp: string) => (
          <div key={fp} className="mb-4">
            <h3 className="text-lg font-semibold text-blue-400">{fp}</h3>
            <table className="w-auto border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-1 px-3">Value</th>
                  <th className="text-right py-1 px-3">Count</th>
                  <th className="text-right py-1 px-3">%</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.distributions[fp] as Record<string, number>)
                  .sort(([, a], [, b]) => b - a)
                  .map(([val, count]) => (
                    <tr key={val} className={`border-b border-gray-800 ${count === 25 ? "bg-green-900/30 font-bold" : ""}`}>
                      <td className="py-1 px-3 font-mono">{val}</td>
                      <td className="text-right py-1 px-3">{count}</td>
                      <td className="text-right py-1 px-3">{(count / data.total * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Confirmation Formula Tests</h2>
        <p className="text-sm text-gray-400 mb-2">Which rule produces exactly 25 confirmed orders? (Marked in green)</p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-2 px-3">Rule / Formula</th>
              <th className="text-right py-2 px-3">Confirmed</th>
              <th className="text-center py-2 px-3">Matches 25?</th>
            </tr>
          </thead>
          <tbody>
            {data.tests.map((t: any, i: number) => (
              <tr key={i} className={`border-b border-gray-800 ${t.matches25 ? "bg-green-900/30" : ""}`}>
                <td className="py-2 px-3 font-mono text-sm">{t.field}</td>
                <td className="text-right py-2 px-3">{t.confirmed}</td>
                <td className="text-center py-2 px-3">{t.matches25 ? "✅ MATCH" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Extra Orders Beyond status=Confirmed</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-900 p-4 rounded">
            <h3 className="font-semibold text-yellow-400">Added by autoConfirmed (not status Confirmed)</h3>
            <p className="text-sm text-gray-400">{data.extraAutoConfirmed.length} orders</p>
            <table className="w-full text-xs mt-2 border-collapse">
              <thead><tr className="border-b border-gray-700"><th className="text-left py-1">ID</th><th className="text-left py-1">Status</th><th className="text-left py-1">autoConfirmed</th></tr></thead>
              <tbody>
                {data.extraAutoConfirmed.map((o: any) => (
                  <tr key={o.id || o._id} className="border-b border-gray-800">
                    <td className="py-1 font-mono">{o.id || o._id}</td>
                    <td className="py-1">{o.status?.name}</td>
                    <td className="py-1">{String(o.autoConfirmed)}</td>
                  </tr>
                ))}
                {data.extraAutoConfirmed.length === 0 && <tr><td colSpan={3} className="py-2 text-gray-500">No extra orders</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-900 p-4 rounded">
            <h3 className="font-semibold text-yellow-400">Added by teleConsultantConfirm (not status Confirmed)</h3>
            <p className="text-sm text-gray-400">{data.extraTeleConsultant.length} orders</p>
            <table className="w-full text-xs mt-2 border-collapse">
              <thead><tr className="border-b border-gray-700"><th className="text-left py-1">ID</th><th className="text-left py-1">Status</th><th className="text-left py-1">teleConsultantConfirm</th></tr></thead>
              <tbody>
                {data.extraTeleConsultant.map((o: any) => (
                  <tr key={o.id || o._id} className="border-b border-gray-800">
                    <td className="py-1 font-mono">{o.id || o._id}</td>
                    <td className="py-1">{o.status?.name}</td>
                    <td className="py-1">{String(o.teleConsultantConfirm)}</td>
                  </tr>
                ))}
                {data.extraTeleConsultant.length === 0 && <tr><td colSpan={3} className="py-2 text-gray-500">No extra orders</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-900 p-4 rounded">
            <h3 className="font-semibold text-yellow-400">Added by statusCallCenter (not status Confirmed)</h3>
            <p className="text-sm text-gray-400">{data.extraStatusCallCenter.length} orders</p>
            <table className="w-full text-xs mt-2 border-collapse">
              <thead><tr className="border-b border-gray-700"><th className="text-left py-1">ID</th><th className="text-left py-1">Status</th><th className="text-left py-1">statusCallCenter</th></tr></thead>
              <tbody>
                {data.extraStatusCallCenter.map((o: any) => (
                  <tr key={o.id || o._id} className="border-b border-gray-800">
                    <td className="py-1 font-mono">{o.id || o._id}</td>
                    <td className="py-1">{o.status?.name}</td>
                    <td className="py-1">{String(o.statusCallCenter)}</td>
                  </tr>
                ))}
                {data.extraStatusCallCenter.length === 0 && <tr><td colSpan={3} className="py-2 text-gray-500">No extra orders</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-900 p-4 rounded">
            <h3 className="font-semibold text-yellow-400">Added by validated_status (not status Confirmed)</h3>
            <p className="text-sm text-gray-400">{data.extraValidatedStatus.length} orders</p>
            <table className="w-full text-xs mt-2 border-collapse">
              <thead><tr className="border-b border-gray-700"><th className="text-left py-1">ID</th><th className="text-left py-1">Status</th><th className="text-left py-1">validated_status</th></tr></thead>
              <tbody>
                {data.extraValidatedStatus.map((o: any) => (
                  <tr key={o.id || o._id} className="border-b border-gray-800">
                    <td className="py-1 font-mono">{o.id || o._id}</td>
                    <td className="py-1">{o.status?.name}</td>
                    <td className="py-1">{String(o.validated_status)}</td>
                  </tr>
                ))}
                {data.extraValidatedStatus.length === 0 && <tr><td colSpan={3} className="py-2 text-gray-500">No extra orders</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Per-Order Field Values</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-1 px-2 sticky left-0 bg-[#0F172A]">ID</th>
                <th className="text-left py-1 px-2 sticky left-0 bg-[#0F172A]">Status</th>
                {data.fieldPaths.map((fp: string) => (
                  <th key={fp} className="text-left py-1 px-2">{fp}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.orderTable.map((row: any, i: number) => (
                <tr key={i} className="border-b border-gray-800">
                  <td className="py-1 px-2 font-mono sticky left-0 bg-[#0F172A]">{row.id}</td>
                  <td className="py-1 px-2 sticky left-0 bg-[#0F172A]">{row.statusName}</td>
                  {data.fieldPaths.map((fp: string) => (
                    <td key={fp} className="py-1 px-2">{String(row[fp] ?? "")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
