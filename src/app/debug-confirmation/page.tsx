"use client";
import { useEffect, useState } from "react";

type FieldInfo = {
  path: string;
  depth: number;
  type: string;
  sampleValue: any;
  nonNullCount: number;
  isDateLike: boolean;
  isArray: boolean;
};

type TeleConsultantInfo = {
  exists: boolean;
  type: string;
  structure: string;
  sampleValues: { id: string; value: any }[];
  count: number;
};

type TodayMatch = {
  fieldPath: string;
  count: number;
  sampleValue: string;
};

type SubEventInfo = {
  subField: string;
  sampleValue: string;
  nonNullCount: number;
  todayCount: number;
};

function isDateLike(val: any): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === "string") {
    return /^\d{4}-\d{2}-\d{2}/.test(val) || /^\d{2}[\/\-]\d{2}[\/\-]\d{4}/.test(val) || /^[A-Z][a-z]{2}\s/.test(val);
  }
  return false;
}

function getTypeLabel(val: any): string {
  if (val === null) return "null";
  if (val === undefined) return "undefined";
  const t = typeof val;
  if (t === "object") {
    if (Array.isArray(val)) return `array[${val.length}]`;
    if (val instanceof Date) return "Date";
    return `object{${Object.keys(val).length}}`;
  }
  return t;
}

function tryParseDate(val: any, today: string): boolean {
  if (val === null || val === undefined || val === "" || val === false) return false;
  try {
    let dateStr: string | null = null;
    if (typeof val === "string" && isDateLike(val)) {
      dateStr = val;
    } else if (typeof val === "object" && !Array.isArray(val)) {
      const o = val as Record<string, any>;
      const dateKey = o.date || o.createdAt || o.updatedAt || o.confirmationDate || o.created_date || o.date_creation;
      if (dateKey && typeof dateKey === "string") dateStr = dateKey;
    }
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    return d.toLocaleDateString("en-CA", { timeZone: "Europe/Paris" }) === today;
  } catch {
    return false;
  }
}

function deepDiscoverFields(
  obj: any,
  prefix: string,
  depth: number,
  maxDepth: number,
  results: FieldInfo[],
  seen: Set<string>
): void {
  if (depth > maxDepth || obj === null || obj === undefined || typeof obj !== "object") return;

  const keys = Object.keys(obj);
  for (const key of keys) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (seen.has(path)) continue;
    seen.add(path);

    const val = obj[key];
    const type = getTypeLabel(val);
    const dl = isDateLike(val);

    results.push({
      path,
      depth,
      type,
      sampleValue: val,
      nonNullCount: 0,
      isDateLike: dl,
      isArray: Array.isArray(val),
    });

    if (val !== null && val !== undefined && typeof val === "object" && !Array.isArray(val)) {
      deepDiscoverFields(val, path, depth + 1, maxDepth, results, seen);
    }
  }
}

export default function DebugConfirmationPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { api } = await import("@/services/api");
        const allOrders = await api.fetchAllOrders();
        const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });

        const scanOrders = allOrders.slice(0, 100);

        // ── STEP 1: Deep discover all fields (first 100 orders, 3 levels) ──
        const seen = new Set<string>();
        const allDiscoveredFields: FieldInfo[] = [];
        for (const order of scanOrders) {
          deepDiscoverFields(order, "", 1, 3, allDiscoveredFields, seen);
        }

        // Deduplicate and count non-null per field
        const fieldMap = new Map<string, { depth: number; type: string; sampleValue: any; isDateLike: boolean; isArray: boolean; nonNullCount: number }>();
        for (const f of allDiscoveredFields) {
          if (!fieldMap.has(f.path)) {
            fieldMap.set(f.path, {
              depth: f.depth,
              type: f.type,
              sampleValue: f.sampleValue,
              isDateLike: f.isDateLike,
              isArray: f.isArray,
              nonNullCount: 0,
            });
          }
        }
        for (const order of scanOrders) {
          for (const path of fieldMap.keys()) {
            const val = path.split(".").reduce((acc: any, part: string) => acc?.[part], order);
            if (val !== null && val !== undefined && val !== "") {
              const entry = fieldMap.get(path)!;
              entry.nonNullCount++;
            }
          }
        }
        const discoveredFields = Array.from(fieldMap.entries())
          .map(([path, info]) => ({ path, ...info }))
          .sort((a, b) => a.path.localeCompare(b.path));

        // ── STEP 2: Priority fields for confirmation ──
        const priorityPatterns = [
          "teleConsultantConfirm", "confirmation", "validated", "status",
          "History", "Log", "Event", "Transition", "logs", "events",
          "timeline", "history", "statusHistory", "transitions",
        ];
        const priorityFields = discoveredFields.filter((f) =>
          priorityPatterns.some((p) => f.path.toLowerCase().includes(p.toLowerCase()))
        );

        // ── STEP 3: teleConsultantConfirm deep dive ──
        const tcc: TeleConsultantInfo = {
          exists: discoveredFields.some((f) => f.path === "teleConsultantConfirm"),
          type: "",
          structure: "",
          sampleValues: [],
          count: 0,
        };
        const tccField = discoveredFields.find((f) => f.path === "teleConsultantConfirm");
        if (tccField) {
          tcc.type = tccField.type;
          tcc.count = tccField.nonNullCount;
          if (tccField.sampleValue && typeof tccField.sampleValue === "object") {
            tcc.structure = JSON.stringify(tccField.sampleValue, null, 2).substring(0, 500);
          } else {
            tcc.structure = `Primitive value: ${JSON.stringify(tccField.sampleValue)}`;
          }
          let sampleCount = 0;
          for (const order of allOrders) {
            const val = (order as any).teleConsultantConfirm;
            if (val !== null && val !== undefined) {
              tcc.sampleValues.push({
                id: order.id || order._id,
                value: typeof val === "object" ? { ...val } : val,
              });
              sampleCount++;
              if (sampleCount >= 5) break;
            }
          }
        }

        // ── STEP 4: Check for array event fields ──
        const arrayEventFields = discoveredFields.filter((f) => f.isArray).map((f) => f.path);
        const arrayEventDetails: { field: string; count: number; sampleItems: any[] }[] = [];
        for (const fieldPath of arrayEventFields) {
          let totalItems = 0;
          const sampleItems: any[] = [];
          for (const order of allOrders) {
            const val = fieldPath.split(".").reduce((acc: any, part: string) => acc?.[part], order);
            if (Array.isArray(val)) {
              totalItems += val.length;
              if (sampleItems.length < 3 && val.length > 0) {
                sampleItems.push(val.slice(0, 2));
              }
            }
          }
          if (totalItems > 0) {
            arrayEventDetails.push({ field: fieldPath, count: totalItems, sampleItems: sampleItems.flat().slice(0, 4) });
          }
        }

        // ── STEP 5: Scan ALL date-like fields for today matches ──
        const todayMatches: TodayMatch[] = [];
        const eventFieldPatterns = ["createdAt", "updatedAt", "date", "At$", "Date$", "_at$", "_date$", "Time$"];
        const dateLikePaths = discoveredFields.filter((f) => {
          if (f.isDateLike) return true;
          if (typeof f.sampleValue === "string" && eventFieldPatterns.some((p) => new RegExp(p).test(f.path))) return true;
          return false;
        });

        for (const fieldInfo of dateLikePaths) {
          let count = 0;
          let sampleVal = "";
          for (const order of allOrders) {
            const val = fieldInfo.path.split(".").reduce((acc: any, part: string) => acc?.[part], order);
            if (tryParseDate(val, today)) {
              count++;
              if (!sampleVal) sampleVal = typeof val === "string" ? val.substring(0, 60) : JSON.stringify(val).substring(0, 60);
            }
          }
          if (count > 0) {
            todayMatches.push({ fieldPath: fieldInfo.path, count, sampleValue: sampleVal });
          }
        }

        // Also scan deeply nested fields (level 3+) for date-like values
        const deeperDateMatches: TodayMatch[] = [];
        for (const order of allOrders) {
          const walk = (obj: any, path: string, depth: number) => {
            if (depth > 5 || !obj || typeof obj !== "object") return;
            for (const key of Object.keys(obj)) {
              const val = obj[key];
              const fullPath = path ? `${path}.${key}` : key;
              if (val !== null && val !== undefined) {
                if (typeof val === "string" && isDateLike(val) && !discoveredFields.some((f) => f.path === fullPath)) {
                  try {
                    const d = new Date(val);
                    if (!isNaN(d.getTime()) && d.toLocaleDateString("en-CA", { timeZone: "Europe/Paris" }) === today) {
                      deeperDateMatches.push({ fieldPath: fullPath, count: 1, sampleValue: val.substring(0, 60) });
                    }
                  } catch {}
                }
                if (typeof val === "object" && !Array.isArray(val)) {
                  walk(val, fullPath, depth + 1);
                }
              }
            }
          };
          walk(order, "", 1);
        }
        const deeperDateCounts = new Map<string, { count: number; sampleValue: string }>();
        for (const m of deeperDateMatches) {
          if (!deeperDateCounts.has(m.fieldPath)) {
            deeperDateCounts.set(m.fieldPath, { count: 0, sampleValue: m.sampleValue });
          }
          deeperDateCounts.get(m.fieldPath)!.count++;
        }
        for (const [path, info] of deeperDateCounts) {
          const existing = todayMatches.find((t) => t.fieldPath === path);
          if (!existing) {
            todayMatches.push({ fieldPath: path, count: info.count, sampleValue: info.sampleValue });
          }
        }

        todayMatches.sort((a, b) => b.count - a.count);

        // ── STEP 6: Combination tests for "25" ──
        // 6a: Unique orders where ANY date-like field = today
        const ordersWithAnyDateToday = new Set<string>();
        for (const order of allOrders) {
          const walkCheck = (obj: any, depth: number): boolean => {
            if (depth > 5 || !obj || typeof obj !== "object") return false;
            for (const key of Object.keys(obj)) {
              const val = obj[key];
              if (val !== null && val !== undefined) {
                if (typeof val === "string" && isDateLike(val)) {
                  try {
                    const d = new Date(val);
                    if (!isNaN(d.getTime()) && d.toLocaleDateString("en-CA", { timeZone: "Europe/Paris" }) === today) {
                      return true;
                    }
                  } catch {}
                }
                if (typeof val === "object" && !Array.isArray(val)) {
                  if (walkCheck(val, depth + 1)) return true;
                }
              }
            }
            return false;
          };
          if (walkCheck(order, 0)) {
            ordersWithAnyDateToday.add(order.id || order._id);
          }
        }

        // 6b: teleConsultantConfirm exists AND its date = today
        const tccTodayOrders = new Set<string>();
        for (const order of allOrders) {
          const tcc = (order as any).teleConsultantConfirm;
          if (tcc !== null && tcc !== undefined) {
            if (typeof tcc === "object") {
              const inner = tcc as Record<string, any>;
              for (const k of Object.keys(inner)) {
                const v = inner[k];
                if (typeof v === "string") {
                  try {
                    const d = new Date(v);
                    if (!isNaN(d.getTime()) && d.toLocaleDateString("en-CA", { timeZone: "Europe/Paris" }) === today) {
                      tccTodayOrders.add(order.id || order._id);
                    }
                  } catch {}
                }
              }
            }
          }
        }

        // 6c: Count validation_status = today (trying different date fields)
        type CombinationTest = { label: string; count: number };
        const combinationTests: CombinationTest[] = [];

        // All the date field counts
        for (const tm of todayMatches) {
          combinationTests.push({ label: `${tm.fieldPath} date = today`, count: tm.count });
        }

        // Orders with any date field = today
        combinationTests.push({ label: "ANY date-like field = today (unique orders)", count: ordersWithAnyDateToday.size });

        // teleConsultantConfirm exists
        combinationTests.push({ label: "teleConsultantConfirm exists (non-null)", count: tcc.count });

        // teleConsultantConfirm date = today
        combinationTests.push({ label: "teleConsultantConfirm.* date = today (unique orders)", count: tccTodayOrders.size });

        // Any event field = today OR teleConsultantConfirm.* = today
        const unionEventOrTcc = new Set([...ordersWithAnyDateToday, ...tccTodayOrders]);
        combinationTests.push({ label: "ANY date field = today OR teleConsultantConfirm.* = today", count: unionEventOrTcc.size });

        // Count of teleConsultantConfirm existing AND any date field = today
        const tccExistsAndAnyDateToday = new Set<string>();
        for (const order of allOrders) {
          const id = order.id || order._id;
          if (ordersWithAnyDateToday.has(id) && (order as any).teleConsultantConfirm !== null && (order as any).teleConsultantConfirm !== undefined) {
            tccExistsAndAnyDateToday.add(id);
          }
        }
        combinationTests.push({ label: "teleConsultantConfirm exists AND any date field = today", count: tccExistsAndAnyDateToday.size });

        const todayMatches25 = combinationTests.filter((t) => t.count === 25);

        setData({
          today,
          totalOrders: allOrders.length,
          discoveredFields,
          priorityFields,
          tcc,
          arrayEventFields: arrayEventDetails,
          todayMatches,
          todayMatches25,
          combinationTests,
        });
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-8 text-white text-lg">Deep-scanning orders...</div>;
  if (error) return <div className="p-8 text-red-400">Error: {error}</div>;
  if (!data) return <div className="p-8 text-white">No data</div>;

  return (
    <div className="p-8 text-white max-w-[1400px] mx-auto space-y-10">
      <h1 className="text-3xl font-bold">Deep Confirmation Event Inspection</h1>
      <p>Paris today: <strong className="text-green-400">{data.today}</strong> | Total orders: <strong>{data.totalOrders}</strong></p>

      {/* ===== MATCHES 25 ===== */}
      <section>
        <h2 className="text-2xl font-semibold mb-3 text-yellow-300">
          Formulas that equal exactly 25
        </h2>
        {data.todayMatches25.length > 0 ? (
          <div className="space-y-2">
            {data.todayMatches25.map((m: any, i: number) => (
              <div key={i} className="bg-green-900/40 border border-green-500 rounded px-4 py-2 text-green-300 font-mono text-lg">
                ✅ {m.label} = <strong className="text-white">{m.count}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400">No single formula matched exactly 25. Review tables below.</p>
        )}
      </section>

      {/* ===== ALL COMBINATION TESTS ===== */}
      <section>
        <h2 className="text-2xl font-semibold mb-3">All Combination Tests</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-600">
              <th className="text-left py-2 px-3">Test</th>
              <th className="text-right py-2 px-3">Count</th>
            </tr>
          </thead>
          <tbody>
            {data.combinationTests.map((t: any, i: number) => (
              <tr key={i} className={`border-b border-gray-800 ${t.count === 25 ? "bg-green-900/30 font-bold" : ""}`}>
                <td className="py-1.5 px-3 font-mono text-xs">{t.label}</td>
                <td className={`text-right py-1.5 px-3 ${t.count === 25 ? "text-green-400 text-lg" : ""}`}>{t.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ===== ALL DATE FIELDS = TODAY TABLE ===== */}
      <section>
        <h2 className="text-2xl font-semibold mb-3">All Date-Like Fields — orders with date = today</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-600">
              <th className="text-left py-2 px-3">Field Path</th>
              <th className="text-right py-2 px-3">Count (date = today)</th>
              <th className="text-left py-2 px-3">Sample Value</th>
            </tr>
          </thead>
          <tbody>
            {data.todayMatches.length > 0 ? (
              data.todayMatches.map((m: any, i: number) => (
                <tr key={i} className={`border-b border-gray-800 ${m.count === 25 ? "bg-green-900/30" : ""}`}>
                  <td className="py-1.5 px-3 font-mono text-xs">{m.fieldPath}</td>
                  <td className={`text-right py-1.5 px-3 ${m.count === 25 ? "text-green-400 font-bold" : ""}`}>{m.count}</td>
                  <td className="py-1.5 px-3 text-xs text-gray-400 truncate max-w-xs">{m.sampleValue}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={3} className="py-4 text-gray-400 text-center">No date-like fields matched today</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {/* ===== teleConsultantConfirm DEEP DIVE ===== */}
      <section className="border border-gray-700 rounded-lg p-6 bg-gray-900/50">
        <h2 className="text-2xl font-semibold mb-4 text-purple-300">teleConsultantConfirm Deep Dive</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-gray-800 rounded p-3">
            <p className="text-gray-400 text-xs">Exists on orders</p>
            <p className="text-2xl font-bold">{data.tcc.count}</p>
          </div>
          <div className="bg-gray-800 rounded p-3">
            <p className="text-gray-400 text-xs">Type</p>
            <p className="text-lg font-mono">{data.tcc.type}</p>
          </div>
          <div className="bg-gray-800 rounded p-3">
            <p className="text-gray-400 text-xs">Structure</p>
            <pre className="text-xs mt-1 text-gray-300 whitespace-pre-wrap max-h-32 overflow-y-auto">{data.tcc.structure}</pre>
          </div>
        </div>
        {data.tcc.sampleValues.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-2">Sample values from 5 orders:</h3>
            {data.tcc.sampleValues.map((sv: any, i: number) => (
              <div key={i} className="bg-gray-800 rounded p-3 mb-2">
                <p className="text-xs text-gray-400 mb-1">Order: <span className="text-white">{sv.id}</span></p>
                <pre className="text-xs text-gray-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {JSON.stringify(sv.value, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== ARRAY EVENT FIELDS ===== */}
      <section>
        <h2 className="text-2xl font-semibold mb-3">Array / Event Fields (logs, events, timeline, history, etc.)</h2>
        {data.arrayEventFields.length > 0 ? (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="text-left py-2 px-3">Field</th>
                <th className="text-right py-2 px-3">Total Items</th>
                <th className="text-left py-2 px-3">Sample Items</th>
              </tr>
            </thead>
            <tbody>
              {data.arrayEventFields.map((a: any, i: number) => (
                <tr key={i} className="border-b border-gray-800">
                  <td className="py-1.5 px-3 font-mono text-xs">{a.field}</td>
                  <td className="text-right py-1.5 px-3">{a.count}</td>
                  <td className="py-1.5 px-3">
                    <pre className="text-xs text-gray-400 max-h-24 overflow-y-auto">
                      {a.sampleItems.length > 0 ? JSON.stringify(a.sampleItems.slice(0, 2), null, 2).substring(0, 300) : "(empty)"}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-400">No array event fields (logs, events, timeline, history, etc.) found in orders.</p>
        )}
      </section>

      {/* ===== PRIORITY FIELDS TABLE ===== */}
      <section>
        <h2 className="text-2xl font-semibold mb-3">Priority Confirmation Fields</h2>
        <p className="text-sm text-gray-400 mb-2">
          teleConsultantConfirm, confirmation*, validated*, status*, *History, *Log*, *Event*, *Transition*, logs, events, timeline
        </p>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-600">
              <th className="text-left py-2 px-3">Field Path</th>
              <th className="text-center py-2 px-3">Depth</th>
              <th className="text-center py-2 px-3">Type</th>
              <th className="text-right py-2 px-3">Non-null count</th>
              <th className="text-left py-2 px-3">Sample Value</th>
            </tr>
          </thead>
          <tbody>
            {data.priorityFields.length > 0 ? (
              data.priorityFields.map((f: any, i: number) => (
                <tr key={i} className="border-b border-gray-800 font-mono text-xs">
                  <td className="py-1.5 px-3 text-purple-300">{f.path}</td>
                  <td className="text-center py-1.5 px-3 text-gray-400">{f.depth}</td>
                  <td className="text-center py-1.5 px-3">{f.type}</td>
                  <td className="text-right py-1.5 px-3">{f.nonNullCount}/{data.totalOrders >= 100 ? 100 : data.totalOrders}</td>
                  <td className="py-1.5 px-3 text-gray-400 truncate max-w-xs">
                    {f.isArray
                      ? `array[${(f.sampleValue as any[])?.length || 0}]`
                      : typeof f.sampleValue === "object"
                        ? JSON.stringify(f.sampleValue).substring(0, 60)
                        : String(f.sampleValue).substring(0, 60)}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} className="py-4 text-gray-400 text-center">No priority fields found</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {/* ===== ALL DISCOVERED FIELDS ===== */}
      <section>
        <h2 className="text-2xl font-semibold mb-3">All Discovered Fields (up to 3 levels deep, first 100 orders)</h2>
        <p className="text-sm text-gray-400 mb-2">{data.discoveredFields.length} unique fields found</p>
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 bg-gray-900">
              <tr className="border-b border-gray-600">
                <th className="text-left py-1 px-2">Field Path</th>
                <th className="text-center py-1 px-2">Depth</th>
                <th className="text-center py-1 px-2">Type</th>
                <th className="text-right py-1 px-2">Non-null / {data.totalOrders >= 100 ? 100 : data.totalOrders}</th>
                <th className="text-left py-1 px-2">Sample Value</th>
              </tr>
            </thead>
            <tbody>
              {data.discoveredFields.map((f: any, i: number) => (
                <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="py-1 px-2 font-mono text-[11px]">{f.path}</td>
                  <td className="text-center py-1 px-2 text-gray-400">{f.depth}</td>
                  <td className="text-center py-1 px-2">{f.type}</td>
                  <td className="text-right py-1 px-2">{f.nonNullCount}</td>
                  <td className="py-1 px-2 text-gray-400 truncate max-w-[200px]">
                    {f.isArray
                      ? `array[${(f.sampleValue as any[])?.length || 0}]`
                      : typeof f.sampleValue === "object" && f.sampleValue !== null
                        ? JSON.stringify(f.sampleValue).substring(0, 80)
                        : String(f.sampleValue ?? "").substring(0, 80)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
