import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("x-auth-token") || "";
    const apiUrl = process.env.CODINAFRICA_API_URL || "https://api.codinafrica.com/api";

    const response = await fetch(`${apiUrl}/orders/search?limit=10`, {
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": token,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch orders" },
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

    return NextResponse.json({
      totalOrders: orders.length,
      uniqueStatuses,
      sampleOrders: statusList,
      rawFirstOrder: orders[0] || null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
