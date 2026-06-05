import { NextResponse } from "next/server";

const CODINAFRICA_API = "https://api.codinafrica.com/api";

function buildHeaders(token: string): HeadersInit {
  return { "Content-Type": "application/json", "X-Auth-Token": token };
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().substring(0, 10);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token param" }, { status: 400 });
  }

  const result: Record<string, any> = {};
  const errors: string[] = [];

  // Probe 1: Try /orders/search with different params to find delivered orders
  const endpointsToTry = [
    "/orders/search?limit=1000&page=1",
    "/orders/search?limit=1000&page=1&status=delivered",
    "/orders/search?limit=1000&page=1&status=Delivered",
    "/orders/search?limit=1000&page=1&status=completed",
    "/orders/search?limit=1000&page=1&status=shipped",
    "/orders/search?limit=1000&page=1&status=shipping",
    "/orders/search?limit=1000&page=1&status_id=s1",
    "/orders/search?limit=1000&page=1&status_id=s2",
    "/deliveries/search?limit=1000",
    "/delivery/search?limit=1000",
    "/shipments/search?limit=1000",
    "/shipment/search?limit=1000",
    "/orders/delivered?limit=1000",
    "/orders/completed?limit=1000",
    "/orders/status/Delivered?limit=1000",
    "/orders/history?limit=1000",
    "/orders/archive?limit=1000",
    "/transactions/search?limit=1000",
    "/fulfillment/search?limit=1000",
    "/logistics/search?limit=1000",
    "/statuses/search?limit=50",
    "/statuses?limit=50",
    "/status-types?limit=50",
    "/status-types/search?limit=50",
    "/dashboard?limit=1000",
    "/dashboard/summary",
    "/dashboard/stats",
    "/dashboard/overview",
    "/analytics/delivery",
    "/analytics/summary",
    "/reports/delivery",
    "/reports/summary",
    "/summary",
    "/orders/counts",
    "/counts",
  ];

  for (const ep of endpointsToTry) {
    try {
      const url = `${CODINAFRICA_API}${ep}`;
      const res = await fetch(url, { headers: buildHeaders(token) });
      const status = res.status;
      if (status === 200) {
        const text = await res.text();
        let parsed: any;
        try { parsed = JSON.parse(text); } catch { parsed = null; }
        const total = parsed?.content?.total || parsed?.total || "?";
        const results = parsed?.content?.results || parsed?.results || [];
        const sampleStatuses = [...new Set(results.slice(0, 20).map((r: any) => r.status?.name || "unknown"))];
        result[ep] = {
          httpStatus: status,
          total,
          resultsCount: results.length,
          sampleStatuses,
          hasData: results.length > 0,
        };
      } else {
        const body = await res.text().catch(() => "");
        result[ep] = { httpStatus: status, error: body.substring(0, 100) };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      result[ep] = { error: msg };
      errors.push(`${ep}: ${msg}`);
    }
  }

  // Probe 2: Get full list of ALL statuses from the orders endpoint
  try {
    const first = await fetch(`${CODINAFRICA_API}/orders/search?limit=1000&page=1`, {
      headers: buildHeaders(token),
    });
    const firstJson = await first.json();
    const totalPages = firstJson?.content?.last_page || 1;
    const allResults = [...(firstJson?.content?.results || [])];

    // Fetch pages 2-5 to get status diversity
    for (let p = 2; p <= Math.min(totalPages, 5); p++) {
      try {
        const r = await fetch(`${CODINAFRICA_API}/orders/search?limit=1000&page=${p}`, {
          headers: buildHeaders(token),
        });
        const j = await r.json();
        allResults.push(...(j?.content?.results || []));
      } catch {}
    }

    const allStatusNames = [...new Set(allResults.map((r: any) => r.status?.name || "unknown"))].sort();
    const allStatusIds = [...new Set(allResults.map((r: any) => r.status?._id || "unknown"))].sort();
    result._allStatusesFound = allStatusNames;
    result._allStatusIdsFound = allStatusIds;
    result._totalPagesInAPI = totalPages;
    result._totalOrders = firstJson?.content?.total || 0;

    // Get yesterday's full data (all pages)
    const yest = yesterday();
    const yesterdayOrders: any[] = [];
    const pagesToFetch = Math.min(totalPages, 35);
    const pagePromises = [];
    for (let p = 1; p <= pagesToFetch; p++) {
      pagePromises.push(
        fetch(`${CODINAFRICA_API}/orders/search?limit=1000&page=${p}`, {
          headers: buildHeaders(token),
        }).then(async (r) => {
          if (!r.ok) throw new Error(`Page ${p} failed`);
          const j = await r.json();
          return j?.content?.results || [];
        })
      );
    }
    const settled = await Promise.allSettled(pagePromises);
    let totalYesterday = 0;
    for (let i = 0; i < settled.length; i++) {
      if (settled[i].status === "fulfilled") {
        const items = (settled[i] as PromiseFulfilledResult<any>).value;
        const yestItems = items.filter((o: any) => (o.updatedAt || o.date || o.createdAt || "").substring(0, 10) === yest);
        yesterdayOrders.push(...yestItems.map((o: any) => ({
          _id: o._id,
          id: o.id,
          statusName: o.status?.name,
          statusId: o.status?._id,
          statusColor: o.status?.color,
          date: o.date,
          createdAt: o.createdAt,
          updatedAt: o.updatedAt,
          source: o.source,
          customerCountry: o.customer?.country,
          amount: o.totalPrice,
        })));
        totalYesterday += yestItems.length;
      }
    }

    const yesterdayStatusBreakdown: Record<string, number> = {};
    for (const o of yesterdayOrders) {
      const s = o.statusName || "unknown";
      yesterdayStatusBreakdown[s] = (yesterdayStatusBreakdown[s] || 0) + 1;
    }

    result._yesterdayFilter = {
      dateFieldUsed: "updatedAt || date || createdAt",
      dateValue: yest,
      totalYesterday,
      statusBreakdown: yesterdayStatusBreakdown,
      orders: yesterdayOrders,
    };
  } catch (err: unknown) {
    result._probeError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({ probeResults: result, errors: errors.length > 0 ? errors : undefined });
}
