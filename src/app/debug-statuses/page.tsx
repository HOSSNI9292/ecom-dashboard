"use client";
import { useEffect, useState } from "react";

function flattenKeys(obj: any, prefix = ""): string[] {
  const keys: string[] = [];
  for (const k of Object.keys(obj || {})) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    keys.push(fullKey);
    if (obj[k] && typeof obj[k] === "object" && !Array.isArray(obj[k]) && k !== "customer" && k !== "status" && k !== "details") {
      keys.push(...flattenKeys(obj[k], fullKey));
    }
  }
  return keys;
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

        // 1. Discover ALL unique top-level keys across today's orders
        const allKeys = new Set<string>();
        const topKeys = new Set<string>();
        for (const raw of todayOrders) {
          const o: any = raw;
          for (const k of Object.keys(o)) {
            topKeys.add(k);
            allKeys.add(k);
          }
          for (const k of Object.keys(o)) {
            if (o[k] && typeof o[k] === "object" && !Array.isArray(o[k])) {
              for (const sk of Object.keys(o[k])) {
                allKeys.add(`${k}.${sk}`);
              }
            }
          }
        }

        const sortedKeys = Array.from(allKeys).sort();

        // 2. Look for call-center / confirmation related fields in each order
        const searchTerms = ["valid", "confirm", "call", "srr", "consult", "callcenter", "call_center", "status_", "approv", "reject"];
        const callCenterFields = sortedKeys.filter((k) =>
          searchTerms.some((t) => k.toLowerCase().includes(t))
        );

        // 3. Build a table: each row = order, each column = potential call-center field
        const callCenterData = todayOrders.map((o: any) => {
          const row: any = { id: o.id || o._id, statusName: o.status?.name };
          for (const field of callCenterFields) {
            const parts = field.split(".");
            let val: any = o;
            for (const p of parts) {
              val = val?.[p];
            }
            row[field] = val !== undefined ? JSON.stringify(val) : "";
          }
          return row;
        });

        // 4. Full raw dump of first 3 orders
        const rawSamples = todayOrders.slice(0, 3).map((o: any) => {
          const sanitized = JSON.parse(JSON.stringify(o));
          return sanitized;
        });

        // 5. Compute confirmed using a hypothetical rule
        // Check if any field has truthy values that could indicate confirmation
        const fieldAnalysis: Record<string, { values: Set<string>; count: number }> = {};
        for (const field of callCenterFields) {
          const info = { values: new Set<string>(), count: 0 };
          for (const o of todayOrders) {
            const parts = field.split(".");
            let val: any = o;
            for (const p of parts) {
              val = val?.[p];
            }
            const str = val !== undefined && val !== null ? JSON.stringify(val) : "undefined";
            info.values.add(str);
            if (val !== undefined && val !== null && val !== false && val !== "") {
              info.count++;
            }
          }
          fieldAnalysis[field] = info;
        }

        setData({
          today, total: todayOrders.length,
          topKeys: Array.from(topKeys).sort(),
          allKeys: sortedKeys,
          callCenterFields,
          callCenterData,
          fieldAnalysis,
          rawSamples,
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
      <h1 className="text-2xl font-bold">Order Fields Deep Investigation</h1>
      <p>Date (Europe/Paris): <strong>{data.today}</strong> | Orders today: <strong>{data.total}</strong></p>
      <p>Status breakdown: {Object.entries(data.statusCounts as Record<string, number>).map(([k, v]) => `${k}=${v}`).join(", ")}</p>
      <p>COD Africa Confirmed: <strong>25</strong></p>

      <div>
        <h2 className="text-xl font-semibold mb-2">All Top-Level Keys in Order Objects</h2>
        <div className="bg-gray-900 p-4 rounded text-xs font-mono overflow-x-auto">
          {data.topKeys.join(", ")}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Call-Center Related Fields Found</h2>
        {data.callCenterFields.length === 0 ? (
          <p className="text-yellow-400">No call-center related fields found in top-level or direct nested objects.</p>
        ) : (
          <div className="bg-gray-900 p-4 rounded text-xs font-mono overflow-x-auto">
            {data.callCenterFields.join(", ")}
          </div>
        )}
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Field Value Analysis (truthy count / total)</h3>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 px-3">Field</th>
                <th className="text-right py-2 px-3">Truthy / Total</th>
                <th className="text-left py-2 px-3">Unique Values</th>
              </tr>
            </thead>
            <tbody>
              {data.callCenterFields.map((field: string) => {
                const info = data.fieldAnalysis[field];
                const vals = Array.from(info.values).slice(0, 10);
                return (
                  <tr key={field} className="border-b border-gray-800 font-mono">
                    <td className="py-1 px-3 text-xs">{field}</td>
                    <td className="text-right py-1 px-3">{info.count}/{data.total}</td>
                    <td className="py-1 px-3 text-xs">{vals.join(", ")}{info.values.size > 10 ? `... (${info.values.size} total)` : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {data.callCenterFields.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Call-Center Field Values per Order</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-1 px-2 sticky left-0 bg-[#0F172A]">ID</th>
                  <th className="text-left py-1 px-2 sticky left-0 bg-[#0F172A]">Status</th>
                  {data.callCenterFields.map((f: string) => (
                    <th key={f} className="text-left py-1 px-2">{f}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.callCenterData.map((row: any, i: number) => (
                  <tr key={i} className="border-b border-gray-800">
                    <td className="py-1 px-2 font-mono sticky left-0 bg-[#0F172A]">{row.id}</td>
                    <td className="py-1 px-2 sticky left-0 bg-[#0F172A]">{row.statusName}</td>
                    {data.callCenterFields.map((f: string) => (
                      <td key={f} className="py-1 px-2">{row[f]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-2">All Fields (keys) — Complete List</h2>
        <details>
          <summary className="cursor-pointer text-sm text-blue-400">{data.allKeys.length} unique keys</summary>
          <div className="bg-gray-900 p-4 rounded text-xs font-mono overflow-x-auto mt-2 whitespace-pre-wrap">
            {data.allKeys.join("\n")}
          </div>
        </details>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Raw JSON — Sample Orders (first 3)</h2>
        <p className="text-sm text-gray-400 mb-2">Full raw object from API for each sample order.</p>
        {data.rawSamples.map((o: any, i: number) => (
          <details key={i} className="mb-4">
            <summary className="cursor-pointer text-sm text-blue-400">Order {o.id || o._id} ({o.status?.name})</summary>
            <pre className="bg-gray-900 p-4 rounded text-xs overflow-x-auto mt-2">{JSON.stringify(o, null, 2)}</pre>
          </details>
        ))}
      </div>
    </div>
  );
}
