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

  try {
    const url = `${CODINAFRICA_API}/shippings/search?limit=50&page=1`;
    const res = await fetch(url, { headers: buildHeaders(token) });
    const raw = await res.json();
    const results = raw?.content?.results || [];
    const total = raw?.content?.total || 0;
    const lastPage = raw?.content?.last_page || 1;

    const output: Record<string, any> = {
      total,
      lastPage,
      firstPageCount: results.length,
    };

    if (results.length > 0) {
      const first = results[0];
      output.sampleFields = Object.keys(first);
      output.sampleItem = first;

      if (first.status && typeof first.status === "object") {
        output.statusType = "object";
        output.statusSample = first.status;
      } else {
        output.statusType = typeof first.status;
        output.statusSample = first.status;
      }

      output.dateFields = {};
      for (const f of ["date", "createdAt", "updatedAt", "shippingDate", "deliveryDate"]) {
        if (first[f]) output.dateFields[f] = first[f];
      }
    }

    const statusBreakdown: Record<string, number> = {};
    for (const r of results) {
      const s = typeof r.status === "object" ? (r.status.name || r.status._id || JSON.stringify(r.status)) : String(r.status);
      statusBreakdown[s] = (statusBreakdown[s] || 0) + 1;
    }
    output.firstPageStatusBreakdown = statusBreakdown;

    return NextResponse.json(output);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
