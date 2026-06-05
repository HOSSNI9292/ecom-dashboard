"use client";
import { useEffect, useState } from "react";

const KEY_FIELDS = ["teleConsultantConfirm", "autoConfirmed", "shippingConfirmCount", "validated_status"];

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

        // Full distribution for each key field across ALL orders
        const fieldDist: Record<string, Record<string, number>> = {};
        const fieldTypes: Record<string, string> = {};

        for (const f of KEY_FIELDS) {
          const dist: Record<string, number> = {};
          let type = "unknown";
          for (const raw of all) {
            const o: any = raw;
            const val = getNested(o, f);
            const key = val === null ? "null" : val === undefined ? "undefined" : String(val);
            dist[key] = (dist[key] || 0) + 1;
            if (type === "unknown" && val !== undefined) {
              type = Array.isArray(val) ? "array" : typeof val;
            }
          }
          fieldDist[f] = dist;
          fieldTypes[f] = type;
        }

        // validated_status: parse as date and group by date
        const validatedDates: Record<string, number> = {};
        for (const raw of all) {
          const o: any = raw;
          const val = getNested(o, "validated_status");
          if (val && typeof val === "string") {
            try {
              const d = new Date(val);
              if (!isNaN(d.getTime())) {
                const dateStr = d.toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
                validatedDates[dateStr] = (validatedDates[dateStr] || 0) + 1;
              } else {
                validatedDates[`invalid: ${val}`] = (validatedDates[`invalid: ${val}`] || 0) + 1;
              }
            } catch {
              validatedDates[`invalid: ${val}`] = (validatedDates[`invalid: ${val}`] || 0) + 1;
            }
          } else if (val !== undefined && val !== null) {
            validatedDates[`non-string: ${JSON.stringify(val)}`] = (validatedDates[`non-string: ${JSON.stringify(val)}`] || 0) + 1;
          } else {
            validatedDates["undefined/null"] = (validatedDates["undefined/null"] || 0) + 1;
          }
        }

        // Orders with validated_status date = today
        const validatedToday = all.filter((raw: any) => {
          const o: any = raw;
          const val = getNested(o, "validated_status");
          if (!val || typeof val !== "string") return false;
          try {
            const d = new Date(val);
            return !isNaN(d.getTime()) && d.toLocaleDateString("en-CA", { timeZone: "Europe/Paris" }) === today;
          } catch { return false; }
        });

        // teleConsultantConfirm: show all values and whether they have nested date/time
        const teleValues: any[] = [];
        for (const raw of all) {
          const o: any = raw;
          const val = getNested(o, "teleConsultantConfirm");
          if (val !== undefined && val !== null) {
            teleValues.push({
              id: o.id || o._id,
              status: o.status?.name,
              createdAt: o.createdAt,
              teleConsultantConfirm: val,
              type: typeof val,
              isObject: typeof val === "object" && !Array.isArray(val),
              nestedKeys: typeof val === "object" && !Array.isArray(val) ? Object.keys(val) : [],
            });
          }
        }

        // autoConfirmed: count true/false/undefined
        const autoConfirmedVals: Record<string, number> = {};
        for (const raw of all) {
          const o: any = raw;
          const val = getNested(o, "autoConfirmed");
          const key = val === true ? "true" : val === false ? "false" : val === undefined ? "undefined" : val === null ? "null" : String(val);
          autoConfirmedVals[key] = (autoConfirmedVals[key] || 0) + 1;
        }
        const autoTrue = all.filter((raw: any) => getNested(raw, "autoConfirmed") === true).length;

        // shippingConfirmCount: distribution
        const shippingCountDist: Record<string, number> = {};
        for (const raw of all) {
          const o: any = raw;
          const val = getNested(o, "shippingConfirmCount");
          const key = val === null ? "null" : val === undefined ? "undefined" : String(val);
          shippingCountDist[key] = (shippingCountDist[key] || 0) + 1;
        }

        // Per-order table for all 4 fields
        const orderTable = all.map((raw: any) => {
          const o: any = raw;
          const createdAtParis = o.createdAt
            ? new Date(o.createdAt).toLocaleDateString("en-CA", { timeZone: "Europe/Paris" })
            : "unknown";
          return {
            id: o.id || o._id,
            status: o.status?.name,
            createdAt: o.createdAt,
            createdAtParis,
            validated_status: getNested(o, "validated_status"),
            validatedDate: getNested(o, "validated_status") && typeof getNested(o, "validated_status") === "string"
              ? (() => { try { return new Date(getNested(o, "validated_status")).toLocaleDateString("en-CA", { timeZone: "Europe/Paris" }); } catch { return ""; } })()
              : "",
            teleConsultantConfirm: JSON.stringify(getNested(o, "teleConsultantConfirm")),
            autoConfirmed: getNested(o, "autoConfirmed"),
            shippingConfirmCount: getNested(o, "shippingConfirmCount"),
          };
        });

        // Try: validated_status date = today gives 25?
        // Try: autoConfirmed = true gives 25?
        // Try: shippingConfirmCount >= 1 gives 25?
        const tests = [
          { label: "validated_status date = today", count: validatedToday.length },
          { label: "autoConfirmed = true", count: autoTrue },
          { label: "shippingConfirmCount >= 1", count: all.filter((raw: any) => { const v = getNested(raw, "shippingConfirmCount"); return v !== undefined && v !== null && Number(v) >= 1; }).length },
          { label: "shippingConfirmCount >= 2", count: all.filter((raw: any) => { const v = getNested(raw, "shippingConfirmCount"); return v !== undefined && v !== null && Number(v) >= 2; }).length },
          { label: "shippingConfirmCount > 0", count: all.filter((raw: any) => { const v = getNested(raw, "shippingConfirmCount"); return v !== undefined && v !== null && Number(v) > 0; }).length },
          { label: "validated_status has value (non-empty)", count: all.filter((raw: any) => { const v = getNested(raw, "validated_status"); return v !== undefined && v !== null && v !== ""; }).length },
          { label: "teleConsultantConfirm exists (non-null, non-undefined)", count: teleValues.length },
          { label: "autoConfirmed = true AND validated_status date = today", count: all.filter((raw: any) => {
              const o: any = raw;
              const ac = getNested(o, "autoConfirmed") === true;
              const vs = getNested(o, "validated_status");
              let vsToday = false;
              if (vs && typeof vs === "string") {
                try { vsToday = new Date(vs).toLocaleDateString("en-CA", { timeZone: "Europe/Paris" }) === today; } catch {}
              }
              return ac && vsToday;
            }).length },
          { label: "validated_status date = today OR autoConfirmed = true", count: all.filter((raw: any) => {
              const o: any = raw;
              const ac = getNested(o, "autoConfirmed") === true;
              const vs = getNested(o, "validated_status");
              let vsToday = false;
              if (vs && typeof vs === "string") {
                try { vsToday = new Date(vs).toLocaleDateString("en-CA", { timeZone: "Europe/Paris" }) === today; } catch {}
              }
              return ac || vsToday;
            }).length },
          { label: "validated_status date = today AND status = Confirmed", count: all.filter((raw: any) => {
              const o: any = raw;
              const isConfirmed = (o.status?.name || "").toLowerCase() === "confirmed";
              const vs = getNested(o, "validated_status");
              let vsToday = false;
              if (vs && typeof vs === "string") {
                try { vsToday = new Date(vs).toLocaleDateString("en-CA", { timeZone: "Europe/Paris" }) === today; } catch {}
              }
              return isConfirmed && vsToday;
            }).length },
          { label: "validated_status date = today OR status = Confirmed", count: all.filter((raw: any) => {
              const o: any = raw;
              const isConfirmed = (o.status?.name || "").toLowerCase() === "confirmed";
              const vs = getNested(o, "validated_status");
              let vsToday = false;
              if (vs && typeof vs === "string") {
                try { vsToday = new Date(vs).toLocaleDateString("en-CA", { timeZone: "Europe/Paris" }) === today; } catch {}
              }
              return isConfirmed || vsToday;
            }).length },
          { label: "createdAt date = today", count: all.filter((raw: any) => {
              if (!raw.createdAt) return false;
              return new Date(raw.createdAt).toLocaleDateString("en-CA", { timeZone: "Europe/Paris" }) === today;
            }).length },
          { label: "validated_status date = today (remove duplicates by id)", count: new Set(validatedToday.map((r: any) => r.id || r._id)).size },
        ];

        // Find exact 25 matches
        const matches25 = tests.filter((t) => t.count === 25);

        // Show which validated_status date = today orders are NOT created today
        const extraFromPriorDays = validatedToday.filter((raw: any) => {
          if (!raw.createdAt) return true;
          return new Date(raw.createdAt).toLocaleDateString("en-CA", { timeZone: "Europe/Paris" }) !== today;
        });

        setData({
          today,
          allCount: all.length,
          fieldDist,
          fieldTypes,
          validatedDates,
          validatedTodayCount: validatedToday.length,
          validatedToday,
          extraFromPriorDays,
          autoTrue,
          autoConfirmedVals,
          shippingCountDist,
          teleValues,
          orderTable,
          tests,
          matches25,
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
      <h1 className="text-2xl font-bold">4-Field Deep Dive</h1>
      <p>Date (Europe/Paris): <strong>{data.today}</strong> | Total orders: <strong>{data.allCount}</strong></p>
      <p>COD Africa Confirmed: <strong>25</strong></p>

      <div>
        <h2 className="text-xl font-semibold mb-2">Confirmation Formula Tests</h2>
        <p className="text-sm text-gray-400 mb-2">✅ MATCH = exactly 25</p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-2 px-3">Rule</th>
              <th className="text-right py-2 px-3">Count</th>
              <th className="text-center py-2 px-3">Matches 25?</th>
            </tr>
          </thead>
          <tbody>
            {data.tests.map((t: any, i: number) => (
              <tr key={i} className={`border-b border-gray-800 ${t.count === 25 ? "bg-green-900/30 font-bold" : ""}`}>
                <td className="py-2 px-3 font-mono text-sm">{t.label}</td>
                <td className="text-right py-2 px-3">{t.count}</td>
                <td className="text-center py-2 px-3">{t.count === 25 ? "✅" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 p-4 rounded">
          <h3 className="font-semibold mb-2">validated_status — Date Distribution</h3>
          <table className="w-full border-collapse text-sm">
            <thead><tr className="border-b border-gray-700"><th className="text-left py-1 px-2">Date</th><th className="text-right py-1 px-2">Count</th></tr></thead>
            <tbody>
              {Object.entries(data.validatedDates as Record<string, number>)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, count]) => (
                  <tr key={date} className={`border-b border-gray-800 ${date === data.today ? "bg-green-900/30 font-bold" : ""}`}>
                    <td className="py-1 px-2 font-mono">{date}</td>
                    <td className="text-right py-1 px-2">{count}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="bg-gray-900 p-4 rounded">
          <h3 className="font-semibold mb-2">autoConfirmed</h3>
          <table className="w-full border-collapse text-sm">
            <thead><tr className="border-b border-gray-700"><th className="text-left py-1 px-2">Value</th><th className="text-right py-1 px-2">Count</th></tr></thead>
            <tbody>
              {Object.entries(data.autoConfirmedVals as Record<string, number>)
                .sort(([, a], [, b]) => b - a)
                .map(([val, count]) => (
                  <tr key={val} className="border-b border-gray-800">
                    <td className="py-1 px-2 font-mono">{val}</td>
                    <td className="text-right py-1 px-2">{count}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          <p className="text-sm mt-2">autoConfirmed = true: <strong>{data.autoTrue}</strong></p>
        </div>

        <div className="bg-gray-900 p-4 rounded">
          <h3 className="font-semibold mb-2">shippingConfirmCount</h3>
          <table className="w-full border-collapse text-sm">
            <thead><tr className="border-b border-gray-700"><th className="text-left py-1 px-2">Value</th><th className="text-right py-1 px-2">Count</th></tr></thead>
            <tbody>
              {Object.entries(data.shippingCountDist as Record<string, number>)
                .sort(([a], [b]) => {
                  const na = Number(a); const nb = Number(b);
                  return isNaN(na) || isNaN(nb) ? a.localeCompare(b) : na - nb;
                })
                .map(([val, count]) => (
                  <tr key={val} className="border-b border-gray-800">
                    <td className="py-1 px-2 font-mono">{val}</td>
                    <td className="text-right py-1 px-2">{count}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="bg-gray-900 p-4 rounded">
          <h3 className="font-semibold mb-2">teleConsultantConfirm</h3>
          <p className="text-sm text-gray-400">{data.teleValues.length} orders have this field</p>
          {data.teleValues.length > 0 && (
            <>
              <p className="text-sm mt-1">Type: <strong>{data.teleValues[0]?.type}</strong></p>
              {data.teleValues[0]?.isObject && (
                <p className="text-sm">Nested keys: <strong>{data.teleValues[0]?.nestedKeys.join(", ")}</strong></p>
              )}
              <table className="w-full border-collapse text-xs mt-2">
                <thead><tr className="border-b border-gray-700"><th className="text-left py-1 px-2">ID</th><th className="text-left py-1 px-2">Status</th><th className="text-left py-1 px-2">Value</th></tr></thead>
                <tbody>
                  {data.teleValues.slice(0, 10).map((o: any, i: number) => (
                    <tr key={i} className="border-b border-gray-800">
                      <td className="py-1 px-2 font-mono">{o.id}</td>
                      <td className="py-1 px-2">{o.status}</td>
                      <td className="py-1 px-2 text-xs">{JSON.stringify(o.teleConsultantConfirm)}</td>
                    </tr>
                  ))}
                  {data.teleValues.length > 10 && <tr><td colSpan={3} className="py-1 text-gray-500">...and {data.teleValues.length - 10} more</td></tr>}
                </tbody>
              </table>
            </>
          )}
          {data.teleValues.length === 0 && <p className="text-gray-500 mt-1">(no orders have this field)</p>}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">validated_status date = today — Extra Orders (created prior)</h2>
        <p className="text-sm text-gray-400">{data.extraFromPriorDays.length} orders with validated_status date = today but createdAt ≠ today</p>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-1 px-2">ID</th>
              <th className="text-left py-1 px-2">Status</th>
              <th className="text-left py-1 px-2">createdAt</th>
              <th className="text-left py-1 px-2">validated_status</th>
            </tr>
          </thead>
          <tbody>
            {data.extraFromPriorDays.map((o: any) => (
              <tr key={o.id || o._id} className="border-b border-gray-800">
                <td className="py-1 px-2 font-mono">{o.id || o._id}</td>
                <td className="py-1 px-2">{o.status?.name}</td>
                <td className="py-1 px-2 text-xs">{o.createdAt}</td>
                <td className="py-1 px-2 text-xs">{o.validated_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Full Order Table — All 4 Fields</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-1 px-2 sticky left-0 bg-[#0F172A]">ID</th>
                <th className="text-left py-1 px-2 sticky left-0 bg-[#0F172A]">Status</th>
                <th className="text-left py-1 px-2">createdAt (Paris)</th>
                <th className="text-left py-1 px-2">validated_status</th>
                <th className="text-left py-1 px-2">validated Date</th>
                <th className="text-left py-1 px-2">teleConsultantConfirm</th>
                <th className="text-left py-1 px-2">autoConfirmed</th>
                <th className="text-left py-1 px-2">shippingConfirmCount</th>
              </tr>
            </thead>
            <tbody>
              {data.orderTable.map((row: any, i: number) => (
                <tr key={i} className="border-b border-gray-800">
                  <td className="py-1 px-2 font-mono sticky left-0 bg-[#0F172A]">{row.id}</td>
                  <td className="py-1 px-2 sticky left-0 bg-[#0F172A]">{row.status}</td>
                  <td className="py-1 px-2">{row.createdAtParis}</td>
                  <td className="py-1 px-2 text-xs">{row.validated_status ? String(row.validated_status).substring(0, 30) : ""}</td>
                  <td className="py-1 px-2">{row.validatedDate}</td>
                  <td className="py-1 px-2 text-xs">{row.teleConsultantConfirm}</td>
                  <td className="py-1 px-2">{row.autoConfirmed === true ? "✅" : row.autoConfirmed === false ? "❌" : ""}</td>
                  <td className="py-1 px-2">{row.shippingConfirmCount !== undefined ? String(row.shippingConfirmCount) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
