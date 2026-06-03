import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  if (!url.startsWith("https://codinafrica.b-cdn.net/")) {
    return new NextResponse("Invalid image source", { status: 403 });
  }

  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Fetch-Site": "cross-site",
        "Sec-Fetch-Mode": "no-cors",
        "Sec-Fetch-Dest": "image",
        Referer: "https://admin.codinafrica.com/",
      },
    });

    if (!resp.ok) {
      return new NextResponse(`CDN error: ${resp.status}`, { status: resp.status });
    }

    const contentType = resp.headers.get("content-type") || "image/png";
    const buffer = await resp.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable, stale-while-revalidate=86400",
        "Access-Control-Allow-Origin": "*",
        "CDN-Cache-Control": "public, max-age=31536000",
        "Vercel-CDN-Cache-Control": "public, max-age=31536000",
      },
    });
  } catch {
    return new NextResponse("Failed to fetch image", { status: 502 });
  }
}
