import { NextRequest, NextResponse } from "next/server";

const CODINAFRICA_API = "https://api.codinafrica.com/api";

function buildHeaders(): HeadersInit {
  const token = process.env.NEXT_PUBLIC_CODINAFRICA_TOKEN || "";
  return { "Content-Type": "application/json", "X-Auth-Token": token };
}

async function fetchAllPages(url: string, limit = 10): Promise<any[]> {
  const all: any[] = [];
  for (let p = 1; p <= limit; p++) {
    try {
      const res = await fetch(`${url}${url.includes("?") ? "&" : "?"}limit=1000&page=${p}`, { headers: buildHeaders() });
      if (!res.ok) break;
      const data = await res.json();
      const results = data?.content?.results || [];
      if (results.length === 0) break;
      all.push(...results);
    } catch { break; }
  }
  return all;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date") || new Date().toISOString().substring(0, 10);
  const today = new Date().toISOString().substring(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().substring(0, 10);

  const result: Record<string, any> = { serverDateUTC: today, yesterday, queriedDate: dateParam };

  // Fetch orders
  const allOrders = await fetchAllPages(`${CODINAFRICA_API}/orders/search`);
  result.ordersTotal = allOrders.length;

  // Status breakdown by date field
  const fields = ["createdAt", "date", "updatedAt"];
  for (const field of fields) {
    for (const date of [today, yesterday, dateParam]) {
      const filtered = allOrders.filter((o) => (o[field] || "").substring(0, 10) === date);
      const breakdown: Record<string, number> = {};
      for (const o of filtered) {
        const s = o.status?.name || "unknown";
        breakdown[s] = (breakdown[s] || 0) + 1;
      }
      const key = `${date}__${field}`;
      result[`orders_${key}`] = { count: filtered.length, breakdown };
    }
  }

  // All statuses in system
  const allStatuses: Record<string, number> = {};
  for (const o of allOrders) {
    const s = o.status?.name || "unknown";
    allStatuses[s] = (allStatuses[s] || 0) + 1;
  }
  result.allOrderStatuses = allStatuses;

  // Sample raw order status fields
  const sampleOrders = allOrders.slice(0, 5).map((o: any) => ({
    _id: o._id,
    id: o.id,
    statusName: o.status?.name,
    statusId: o.status?._id,
    createdAt: o.createdAt,
    date: o.date,
    updatedAt: o.updatedAt,
  }));
  result.sampleOrders = sampleOrders;

  // Try statuses endpoint
  try {
    const statusRes = await fetch(`${CODINAFRICA_API}/statuses/search?limit=50`, { headers: buildHeaders() });
    if (statusRes.ok) {
      const statusData = await statusRes.json();
      result.statusesEndpoint = statusData;
    }
  } catch { }

  return NextResponse.json(result);
}
