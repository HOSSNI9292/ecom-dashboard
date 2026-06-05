"use client";
import { useEffect, useState } from "react";

const CONFIRM_FIELDS = ["statusCallCenter", "validated_status", "teleConsultantConfirm", "autoConfirmed"];
const DATE_SUFFIXES = ["At", "Date", "date", "Time", "time", "_at", "At", "on", "On"];

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
        const todayParis = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });

        // First, discover ALL keys across ALL orders to find confirmation date fields
        const allKeys = new Set<string>();
        const dateKeys = new Set<string>();
        const confirmDateCandidates: string[] = [];

        for (const raw of all) {
          const o: any = raw;
          for (const k of Object.keys(o)) {
            allKeys.add(k);
            if (DATE_SUFFIXES.some((s) => k.includes(s) || k.endsWith(s))) {
              dateKeys.add(k);
            }
            if (CONFIRM_FIELDS.some((f) => k.toLowerCase().includes(f.toLowerCase()))) {
              dateKeys.add(k);
            }
          }
          // Nested keys
          for (const k of Object.keys(o)) {
            if (o[k] && typeof o[k] === "object" && !Array.isArray(o[k])) {
              for (const sk of Object.keys(o[k])) {
                const full = `${k}.${sk}`;
                allKeys.add(full);
                if (DATE_SUFFIXES.some((s) => sk.includes(s) || sk.endsWith(s)) || CONFIRM_FIELDS.some((f) => sk.toLowerCase().includes(f.toLowerCase()))) {
                  dateKeys.add(full);
                }
              }
            }
          }
        }

        const sortedDateKeys = Array.from(dateKeys).sort();
        const sortedAllKeys = Array.from(allKeys).sort();

        // Now find orders confirmed today by any field
        // For each order, check if any confirmation field or date field indicates today
        const confirmedTodayViaField: any[] = [];
        const confirmedOrdersById = new Map<string, any>();

        for (const raw of all) {
          const o: any = raw;
          const createdAtParis = o.createdAt
            ? new Date(o.createdAt).toLocaleDateString("en-CA", { timeZone: "Europe/Paris" })
            : "unknown";
          const createdToday = createdAtParis === todayParis;

          // Check all date-key fields for today's date
          const confirmFieldsThatMatch: string[] = [];

          for (const fp of sortedDateKeys) {
            const val = getNested(o, fp);
            if (val === null || val === undefined || val === "") continue;
            const valStr = String(val);
            // Check if this value contains today's date
            if (valStr.includes(todayParis)) {
              confirmFieldsThatMatch.push(`${fp}=${valStr}`);
            }
          }

          if (confirmFieldsThatMatch.length > 0) {
            confirmedTodayViaField.push({
              id: o.id || o._id,
              status: o.status?.name,
              createdAt: o.createdAt,
              createdToday,
              confirmFields: confirmFieldsThatMatch,
            });
            confirmedOrdersById.set(o.id || o._id, o);
          }
        }

        // Also try: statusCallCenter === "Confirmed" regardless of date
        const statusCallCenterConfirmed: any[] = [];
        for (const raw of all) {
          const o: any = raw;
          const val = getNested(o, "statusCallCenter");
          if (val !== undefined && val !== null && String(val).toLowerCase() === "confirmed") {
            const createdAtParis = o.createdAt
              ? new Date(o.createdAt).toLocaleDateString("en-CA", { timeZone: "Europe/Paris" })
              : "unknown";
            statusCallCenterConfirmed.push({
              id: o.id || o._id,
              status: o.status?.name,
              createdAt: o.createdAt,
              createdToday: createdAtParis === todayParis,
              createdAtParis,
              statusCallCenter: val,
            });
          }
        }

        // Now check orders created today only, and compare
        const todayCreated: any[] = all.filter((raw: any) => {
          if (!raw.createdAt) return false;
          return new Date(raw.createdAt).toLocaleDateString("en-CA", { timeZone: "Europe/Paris" }) === todayParis;
        });

        // Distribution of statusCallCenter among today-created orders
        const sccDistToday: Record<string, number> = {};
        for (const o of todayCreated) {
          const val = String(getNested(o, "statusCallCenter") ?? "undefined");
          sccDistToday[val] = (sccDistToday[val] || 0) + 1;
        }

        // Distribution of statusCallCenter among ALL orders (for comparison)
        const sccDistAll: Record<string, number> = {};
        for (const raw of all) {
          const o: any = raw;
          const val = String(getNested(o, "statusCallCenter") ?? "undefined");
          sccDistAll[val] = (sccDistAll[val] || 0) + 1;
        }

        // Show all dates-related keys and their values for a few sample orders
        const dateKeySamples = all.slice(0, 5).map((raw: any) => {
          const o: any = raw;
          const row: any = { id: o.id || o._id, status: o.status?.name };
          for (const k of sortedDateKeys) {
            row[k] = getNested(o, k);
          }
          return row;
        });

        // Orders where statusCallCenter = Confirmed AND created today = our 16
        const sccConfirmedCreatedToday = statusCallCenterConfirmed.filter((o: any) => o.createdToday);
        
        // Orders where statusCallCenter = Confirmed regardless of creation date = COD Africa's 25?
        const sccConfirmedAll = statusCallCenterConfirmed;

        // Check validated_status with value "Confirmed" or similar
        const validatedConfirmed: any[] = [];
        for (const raw of all) {
          const o: any = raw;
          const val = getNested(o, "validated_status");
          if (val !== undefined && val !== null && val !== "" && val !== false) {
            const createdAtParis = o.createdAt
              ? new Date(o.createdAt).toLocaleDateString("en-CA", { timeZone: "Europe/Paris" })
              : "unknown";
            validatedConfirmed.push({
              id: o.id || o._id,
              status: o.status?.name,
              createdAt: o.createdAt,
              createdToday: createdAtParis === todayParis,
              validated_status: val,
            });
          }
        }

        setData({
          todayParis,
          allCount: all.length,
          todayCreatedCount: todayCreated.length,
          confirmedTodayViaFieldCount: confirmedTodayViaField.length,
          confirmedTodayViaField,
          statusCallCenterConfirmedCountAll: sccConfirmedAll.length,
          statusCallCenterConfirmedCountToday: sccConfirmedCreatedToday.length,
          statusCallCenterConfirmedAll: sccConfirmedAll,
          statusCallCenterConfirmedToday: sccConfirmedCreatedToday,
          validatedConfirmedCount: validatedConfirmed.length,
          validatedConfirmed,
          sccDistToday,
          sccDistAll,
          todayStatusBreakdown: todayCreated.reduce((acc: any, o: any) => {
            const s = o.status?.name || "unknown";
            acc[s] = (acc[s] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          sortedDateKeys,
          sortedAllKeys,
          dateKeySamples,
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
      <h1 className="text-2xl font-bold">Confirmation Date Investigation</h1>
      <p>Date (Europe/Paris): <strong>{data.todayParis}</strong></p>
      <p>Total API orders: <strong>{data.allCount}</strong> | Created today: <strong>{data.todayCreatedCount}</strong></p>
      <p>Status breakdown (created today): {Object.entries(data.todayStatusBreakdown as Record<string, number>).map(([k, v]) => `${k}=${v}`).join(", ")}</p>
      <p>COD Africa Confirmed: <strong>25</strong></p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900 p-4 rounded">
          <h3 className="font-semibold">statusCallCenter = Confirmed</h3>
          <p className="text-2xl font-bold text-blue-400">{data.statusCallCenterConfirmedCountAll}</p>
          <p className="text-sm text-gray-400">across ALL orders (regardless of createdAt)</p>
          {data.statusCallCenterConfirmedCountAll === 25 && <p className="text-green-400 font-bold">✅ MATCHES 25</p>}
        </div>
        <div className="bg-gray-900 p-4 rounded">
          <h3 className="font-semibold">statusCallCenter = Confirmed</h3>
          <p className="text-2xl font-bold text-yellow-400">{data.statusCallCenterConfirmedCountToday}</p>
          <p className="text-sm text-gray-400">only among orders created today</p>
        </div>
        <div className="bg-gray-900 p-4 rounded">
          <h3 className="font-semibold">Any date field = today</h3>
          <p className="text-2xl font-bold text-purple-400">{data.confirmedTodayViaFieldCount}</p>
          <p className="text-sm text-gray-400">orders with any date/confirm field = today</p>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">statusCallCenter Distribution (created today)</h2>
        <table className="w-auto border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-1 px-3">Value</th>
              <th className="text-right py-1 px-3">Count</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(data.sccDistToday as Record<string, number>)
              .sort(([, a], [, b]) => b - a)
              .map(([val, count]) => (
                <tr key={val} className="border-b border-gray-800">
                  <td className="py-1 px-3 font-mono">{val}</td>
                  <td className="text-right py-1 px-3">{count}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">statusCallCenter Distribution (ALL orders)</h2>
        <table className="w-auto border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-1 px-3">Value</th>
              <th className="text-right py-1 px-3">Count</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(data.sccDistAll as Record<string, number>)
              .sort(([, a], [, b]) => b - a)
              .map(([val, count]) => (
                <tr key={val} className="border-b border-gray-800">
                  <td className="py-1 px-3 font-mono">{val}</td>
                  <td className="text-right py-1 px-3">{count}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">statusCallCenter = Confirmed Orders (all)</h2>
        <p>Count: <strong>{data.statusCallCenterConfirmedCountAll}</strong></p>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-1 px-2">ID</th>
              <th className="text-left py-1 px-2">Status</th>
              <th className="text-left py-1 px-2">createdAt</th>
              <th className="text-left py-1 px-2">Created Today?</th>
              <th className="text-left py-1 px-2">statusCallCenter</th>
            </tr>
          </thead>
          <tbody>
            {data.statusCallCenterConfirmedAll.map((o: any) => (
              <tr key={o.id} className={`border-b border-gray-800 ${o.createdToday ? "" : "bg-yellow-900/20"}`}>
                <td className="py-1 px-2 font-mono">{o.id}</td>
                <td className="py-1 px-2">{o.status}</td>
                <td className="py-1 px-2 text-xs">{o.createdAt}</td>
                <td className="py-1 px-2">{o.createdToday ? "✅" : "❌ (prior day)"}</td>
                <td className="py-1 px-2">{o.statusCallCenter}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">validated_status Values (non-empty, all orders)</h2>
        <p>Count: <strong>{data.validatedConfirmedCount}</strong></p>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-1 px-2">ID</th>
              <th className="text-left py-1 px-2">Status</th>
              <th className="text-left py-1 px-2">createdAt</th>
              <th className="text-left py-1 px-2">Created Today?</th>
              <th className="text-left py-1 px-2">validated_status</th>
            </tr>
          </thead>
          <tbody>
            {data.validatedConfirmed.map((o: any) => (
              <tr key={o.id} className="border-b border-gray-800">
                <td className="py-1 px-2 font-mono">{o.id}</td>
                <td className="py-1 px-2">{o.status}</td>
                <td className="py-1 px-2 text-xs">{o.createdAt}</td>
                <td className="py-1 px-2">{o.createdToday ? "✅" : "❌ (prior day)"}</td>
                <td className="py-1 px-2">{JSON.stringify(o.validated_status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Date-Related Keys Found Across All Orders</h2>
        <details>
          <summary className="cursor-pointer text-sm text-blue-400">{data.sortedDateKeys.length} keys — click to expand</summary>
          <div className="bg-gray-900 p-4 rounded text-xs font-mono mt-2 overflow-x-auto whitespace-pre-wrap">
            {data.sortedDateKeys.join("\n")}
          </div>
        </details>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Order Samples — All Date/Confirm Fields</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-1 px-2 sticky left-0 bg-[#0F172A]">ID</th>
                <th className="text-left py-1 px-2 sticky left-0 bg-[#0F172A]">Status</th>
                {data.sortedDateKeys.map((k: string) => (
                  <th key={k} className="text-left py-1 px-2 whitespace-nowrap">{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.dateKeySamples.map((row: any, i: number) => (
                <tr key={i} className="border-b border-gray-800">
                  <td className="py-1 px-2 font-mono sticky left-0 bg-[#0F172A]">{row.id}</td>
                  <td className="py-1 px-2 sticky left-0 bg-[#0F172A]">{row.status}</td>
                  {data.sortedDateKeys.map((k: string) => (
                    <td key={k} className="py-1 px-2 whitespace-nowrap">{row[k] !== undefined ? String(row[k]) : ""}</td>
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
