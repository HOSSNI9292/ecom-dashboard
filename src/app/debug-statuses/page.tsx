"use client";
import { useEffect, useState } from "react";

function getNested(obj: any, path: string): any {
  return path.split(".").reduce((acc, part) => acc?.[part], obj);
}

// Discover all date-ish fields from a sample of orders
function discoverDateFields(orders: any[]): string[] {
  const dateFieldCandidates = new Set<string>();
  const dateSuffixes = ["At", "Date", "date", "Time", "time", "_at", "_date", "on", "On"];
  const confirmWords = ["valid", "confirm", "process", "paid", "deliver", "ship", "call", "srr", "consult"];

  for (const raw of orders.slice(0, 50)) {
    const o: any = raw;
    for (const k of Object.keys(o)) {
      const matches = dateSuffixes.some((s) => k.endsWith(s) || k.includes(s));
      const matchesConfirm = confirmWords.some((w) => k.toLowerCase().includes(w));
      if (matches || matchesConfirm) dateFieldCandidates.add(k);
    }
    // nested
    for (const k of Object.keys(o)) {
      if (o[k] && typeof o[k] === "object" && !Array.isArray(o[k])) {
        for (const sk of Object.keys(o[k])) {
          const full = `${k}.${sk}`;
          const matches = dateSuffixes.some((s) => sk.endsWith(s) || sk.includes(s));
          const matchesConfirm = confirmWords.some((w) => sk.toLowerCase().includes(w));
          if (matches || matchesConfirm) dateFieldCandidates.add(full);
        }
      }
    }
  }
  return Array.from(dateFieldCandidates).sort();
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

        // Discover date fields from a sample
        const dateFields = discoverDateFields(all);
        const priorityFields = ["validated_status", "teleConsultantConfirm", "processedAt", "paidAt", "deliveredAt", "shippedAt", "confirmedAt", "statusCallCenter"];

        // Ensure priority fields are included
        for (const pf of priorityFields) {
          if (!dateFields.includes(pf)) dateFields.push(pf);
        }

        // For each date field, count orders where that field's date = today (Paris)
        const fieldTodayCounts: { field: string; count: number; sample: any }[] = [];
        for (const f of dateFields) {
          let count = 0;
          let sampleVal: any = null;
          for (const raw of all) {
            const o: any = raw;
            const val = getNested(o, f);
            if (val === null || val === undefined || val === "" || val === false) continue;
            // Try to parse as date
            let dateStr = "";
            if (typeof val === "string") {
              try {
                const d = new Date(val);
                if (!isNaN(d.getTime())) dateStr = d.toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
              } catch {}
            } else if (typeof val === "object" && val !== null && !Array.isArray(val)) {
              // Maybe has a date inside
              try {
                const d = new Date(JSON.stringify(val));
                if (!isNaN(d.getTime())) dateStr = d.toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
              } catch {}
            }
            if (dateStr === today) {
              count++;
              if (!sampleVal) sampleVal = val;
            }
          }
          if (count > 0) {
            fieldTodayCounts.push({ field: f, count, sample: sampleVal });
          }
        }

        // Sort by count descending
        fieldTodayCounts.sort((a, b) => b.count - a.count);

        // For validated_status specifically, show full distribution by date
        const vsDateDist: Record<string, number> = {};
        for (const raw of all) {
          const o: any = raw;
          const val = getNested(o, "validated_status");
          if (val && typeof val === "string") {
            try {
              const d = new Date(val);
              if (!isNaN(d.getTime())) {
                const ds = d.toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
                vsDateDist[ds] = (vsDateDist[ds] || 0) + 1;
              }
            } catch {}
          }
        }

        // Get the orders that were validated today
        const validatedToday = all.filter((raw: any) => {
          const o: any = raw;
          const val = getNested(o, "validated_status");
          if (!val || typeof val !== "string") return false;
          try {
            return new Date(val).toLocaleDateString("en-CA", { timeZone: "Europe/Paris" }) === today;
          } catch { return false; }
        });

        // Get orders created today
        const createdToday = all.filter((raw: any) => {
          if (!raw.createdAt) return false;
          return new Date(raw.createdAt).toLocaleDateString("en-CA", { timeZone: "Europe/Paris" }) === today;
        });

        // Test combinations
        const tests: { label: string; count: number }[] = [];

        // Single field tests
        for (const ft of fieldTodayCounts) {
          tests.push({ label: `${ft.field} date = today`, count: ft.count });
        }

        // validated_status + created today
        const both = validatedToday.filter((raw: any) => {
          if (!raw.createdAt) return false;
          return new Date(raw.createdAt).toLocaleDateString("en-CA", { timeZone: "Europe/Paris" }) === today;
        });
        tests.push({ label: "validated_status date = today AND createdAt = today", count: both.length });

        // validated today OR created today (status confirmed)
        const statusConfirmedToday = createdToday.filter((raw: any) => {
          return (raw.status?.name || "").toLowerCase() === "confirmed";
        });
        const validatedOrConfirmed = new Set<string>();
        for (const o of validatedToday) validatedOrConfirmed.add(o.id || o._id);
        for (const o of statusConfirmedToday) validatedOrConfirmed.add(o.id || o._id);
        tests.push({ label: "validated_status date = today OR status=Confirmed (created today)", count: validatedOrConfirmed.size });

        // validated today OR any order created today with status confirmed/processed/delivered/shipping/shipped
        const confirmedStatuses = ["confirmed", "processed", "delivered", "shipping", "shipped"];
        const createdTodayConfirmedStatus = createdToday.filter((raw: any) => {
          return confirmedStatuses.includes((raw.status?.name || "").toLowerCase());
        });
        const validatedOrMappedStatus = new Set<string>();
        for (const o of validatedToday) validatedOrMappedStatus.add(o.id || o._id);
        for (const o of createdTodayConfirmedStatus) validatedOrMappedStatus.add(o.id || o._id);
        tests.push({ label: "validated_status date=today OR status in (confirmed,processed,delivered,shipping,shipped) created today", count: validatedOrMappedStatus.size });

        // Raw order status = Confirmed (across all orders, not just today)
        const statusConfirmedAll = all.filter((raw: any) => (raw.status?.name || "").toLowerCase() === "confirmed").length;
        tests.push({ label: "status = Confirmed (all orders)", count: statusConfirmedAll });

        // validated_status date = today (deduplicated by id)
        tests.push({ label: "validated_status date = today (unique IDs)", count: new Set(validatedToday.map((r: any) => r.id || r._id)).size });

        // Show details: validated today but NOT created today
        const priorDayValidated = validatedToday.filter((raw: any) => {
          if (!raw.createdAt) return true;
          return new Date(raw.createdAt).toLocaleDateString("en-CA", { timeZone: "Europe/Paris" }) !== today;
        });

        setData({
          today,
          totalOrders: all.length,
          fieldTodayCounts,
          vsDateDist,
          validatedTodayCount: validatedToday.length,
          createdTodayCount: createdToday.length,
          statusConfirmedTodayCount: statusConfirmedToday.length,
          priorDayValidated,
          tests,
          matches25: tests.filter((t) => t.count === 25).map((t) => t.label),
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
      <h1 className="text-2xl font-bold">TODAY Confirmation — Field Date Analysis</h1>
      <p>Date (Europe/Paris): <strong>{data.today}</strong></p>
      <p>Total API orders: <strong>{data.totalOrders}</strong> | Created today: <strong>{data.createdTodayCount}</strong> | status=Confirmed (today): <strong>{data.statusConfirmedTodayCount}</strong></p>
      <p>COD Africa Confirmed: <strong>25</strong></p>

      <div>
        <h2 className="text-xl font-semibold mb-2">✅ Formulas that match exactly 25</h2>
        {data.matches25.length > 0 ? (
          <ul className="list-disc list-inside space-y-1">
            {data.matches25.map((m: string, i: number) => (
              <li key={i} className="text-green-400 font-bold">{m}</li>
            ))}
          </ul>
        ) : (
          <p className="text-yellow-400">No single formula matched 25. Check the table below.</p>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">All Formula Tests</h2>
        <p className="text-sm text-gray-400 mb-2">Green row = exactly 25</p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-2 px-3">Formula</th>
              <th className="text-right py-2 px-3">Count</th>
              <th className="text-center py-2 px-3">=25?</th>
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

      <div>
        <h2 className="text-xl font-semibold mb-2">Date Fields — Orders with field date = today (Paris)</h2>
        <p className="text-sm text-gray-400 mb-2">Only showing fields with at least 1 match</p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-2 px-3">Field</th>
              <th className="text-right py-2 px-3">Count (date = today)</th>
              <th className="text-center py-2 px-3">=25?</th>
              <th className="text-left py-2 px-3">Sample Value</th>
            </tr>
          </thead>
          <tbody>
            {data.fieldTodayCounts.map((ft: any, i: number) => (
              <tr key={i} className={`border-b border-gray-800 ${ft.count === 25 ? "bg-green-900/30 font-bold" : ""}`}>
                <td className="py-2 px-3 font-mono">{ft.field}</td>
                <td className="text-right py-2 px-3">{ft.count}</td>
                <td className="text-center py-2 px-3">{ft.count === 25 ? "✅" : ft.count > 0 ? ft.count + "" : ""}</td>
                <td className="py-2 px-3 text-xs text-gray-400">{ft.sample ? String(ft.sample).substring(0, 40) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">validated_status — Date Distribution</h2>
        <table className="w-auto border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-1 px-3">Date</th>
              <th className="text-right py-1 px-3">Count</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(data.vsDateDist as Record<string, number>)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, count]) => (
                <tr key={date} className={`border-b border-gray-800 ${date === data.today ? "bg-green-900/30 font-bold" : ""}`}>
                  <td className="py-1 px-3 font-mono">{date}</td>
                  <td className="text-right py-1 px-3">{count}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {data.priorDayValidated.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Validated Today — Created on Prior Days</h2>
          <p className="text-sm text-gray-400">{data.priorDayValidated.length} orders: validated today but created earlier</p>
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
              {data.priorDayValidated.map((o: any) => (
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
      )}
    </div>
  );
}
