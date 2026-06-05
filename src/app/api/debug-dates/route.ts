import { NextResponse } from "next/server";

const CODINAFRICA_API = "https://api.codinafrica.com/api";

function buildHeaders(token: string): HeadersInit {
  return { "Content-Type": "application/json", "X-Auth-Token": token };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token param" }, { status: 400 });
  }

  const today = new Date().toISOString().substring(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().substring(0, 10);

  const result: Record<string, any> = { serverDateUTC: today, yesterday };

  // === ORDERS ===
  try {
    const first = await fetch(`${CODINAFRICA_API}/orders/search?limit=1000&page=1`, {
      headers: buildHeaders(token),
    }).then((r) => r.json());
    const totalOrders = first?.content?.total || 0;
    const lastPage = first?.content?.last_page || 1;

    const allOrders: any[] = [...(first?.content?.results || [])];
    const pagesToFetch = Math.min(lastPage, 7);
    for (let p = 2; p <= pagesToFetch; p++) {
      try {
        const r = await fetch(`${CODINAFRICA_API}/orders/search?limit=1000&page=${p}`, {
          headers: buildHeaders(token),
        }).then((r) => r.json());
        allOrders.push(...(r?.content?.results || []));
      } catch { }
    }

    const countByField = (field: string, date: string) =>
      allOrders.filter((o) => (o[field] || "").substring(0, 10) === date).length;
    const countFrom = (field: string, date: string) =>
      allOrders.filter((o) => (o[field] || "").substring(0, 10) >= date).length;

    const getStatusBreakdown = (field: string, date: string): Record<string, number> => {
      const b: Record<string, number> = {};
      for (const o of allOrders) {
        if ((o[field] || "").substring(0, 10) === date) {
          const s = o.status?.name || "unknown";
          b[s] = (b[s] || 0) + 1;
        }
      }
      return b;
    };

    result.orders = {
      total: totalOrders,
      today: {
        createdAt: countByField("createdAt", today),
        date: countByField("date", today),
        updatedAt: countByField("updatedAt", today),
      },
      yesterday: {
        createdAt: countByField("createdAt", yesterday),
        date: countByField("date", yesterday),
        updatedAt: countByField("updatedAt", yesterday),
      },
    };

    result.orders.todayStatusBreakdownByCreatedAt = getStatusBreakdown("createdAt", today);
    result.orders.todayStatusBreakdownByUpdatedAt = getStatusBreakdown("updatedAt", today);
    result.orders.yesterdayStatusBreakdownByCreatedAt = getStatusBreakdown("createdAt", yesterday);
    result.orders.yesterdayStatusBreakdownByUpdatedAt = getStatusBreakdown("updatedAt", yesterday);
  } catch (e: any) {
    result.ordersError = e.message;
  }

  // === SHIPPINGS ===
  try {
    const sfirst = await fetch(`${CODINAFRICA_API}/shippings/search?limit=1000&page=1`, {
      headers: buildHeaders(token),
    }).then((r) => r.json());
    const totalShippings = sfirst?.content?.total || 0;
    const slastPage = sfirst?.content?.last_page || 1;

    const allShippings: any[] = [...(sfirst?.content?.results || [])];
    const spages = Math.min(slastPage, 7);
    for (let p = 2; p <= spages; p++) {
      try {
        const r = await fetch(`${CODINAFRICA_API}/shippings/search?limit=1000&page=${p}`, {
          headers: buildHeaders(token),
        }).then((r) => r.json());
        allShippings.push(...(r?.content?.results || []));
      } catch { }
    }

    result.shippings = {
      total: totalShippings,
      allStatuses: [...new Set(allShippings.map((s: any) => s.status))].sort(),
      yesterdayStatusBreakdownByCreatedAt: {} as Record<string, number>,
      yesterdayStatusBreakdownByDate: {} as Record<string, number>,
      yesterdayStatusBreakdownByUpdatedAt: {} as Record<string, number>,
      yesterdayStatusBreakdownByDeliveredAt: {} as Record<string, number>,
      yesterdayStatusBreakdownByPaidAt: {} as Record<string, number>,
    };

    const shipFields = [
      "createdAt", "date", "updatedAt", "deliveredAt", "paidAt"
    ];

    for (const field of shipFields) {
      const breakdown: Record<string, number> = {};
      for (const s of allShippings) {
        if ((s[field] || "").substring(0, 10) === yesterday) {
          const st = s.status || "unknown";
          breakdown[st] = (breakdown[st] || 0) + 1;
        }
      }
      result.shippings[`yesterdayStatusBreakdownBy${field.charAt(0).toUpperCase() + field.slice(1)}`] = breakdown;
    }

    // Also show ALL date fields available on a sample shipping
    const sample = allShippings[0] || {};
    result.shippings.sampleDateFields = {};
    for (const f of ["createdAt", "date", "updatedAt", "deliveredAt", "paidAt", "shippingDate", "deliveryDate"]) {
      if (sample[f] !== undefined) result.shippings.sampleDateFields[f] = sample[f];
    }
    if (allShippings.length > 0) {
      result.shippings.sampleStatus = sample.status;
    }

    // Today's shippings by updatedAt
    const todayByUpdatedAt: Record<string, number> = {};
    for (const s of allShippings) {
      if ((s.updatedAt || "").substring(0, 10) === today) {
        const st = s.status || "unknown";
        todayByUpdatedAt[st] = (todayByUpdatedAt[st] || 0) + 1;
      }
    }
    result.shippings.todayStatusBreakdownByUpdatedAt = todayByUpdatedAt;

  } catch (e: any) {
    result.shippingsError = e.message;
  }

  return NextResponse.json(result);
}
