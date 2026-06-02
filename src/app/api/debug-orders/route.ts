import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("x-auth-token") || "";
    const apiUrl = process.env.CODINAFRICA_API_URL || "https://api.codinafrica.com/api";

    const response = await fetch(`${apiUrl}/orders/search?limit=100`, {
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": token,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch orders", status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();
    const orders = data?.content?.results || [];

    const statusList = orders.map((o: any) => ({
      id: o.id,
      statusName: o.status?.name,
      statusColor: o.status?.color,
      statusId: o.status?._id,
      date: o.date,
    }));

    const uniqueStatuses = [...new Set(statusList.map((s: any) => s.statusName))];

    const statusCounts: Record<string, number> = {};
    statusList.forEach((s: any) => {
      const name = s.statusName || "unknown";
      statusCounts[name] = (statusCounts[name] || 0) + 1;
    });

    return NextResponse.json({
      totalOrders: orders.length,
      uniqueStatuses,
      statusCounts,
      sampleOrders: statusList.slice(0, 20),
      rawFirstOrder: orders[0] ? {
        id: orders[0].id,
        status: orders[0].status,
        date: orders[0].date,
        customer: orders[0].customer?.country,
      } : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch orders", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
