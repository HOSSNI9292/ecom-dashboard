import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { redirectUri } = await request.json();
    if (!redirectUri) {
      return NextResponse.json({ error: "Missing redirectUri" }, { status: 400 });
    }
    const { getMetaAppConfig } = await import("@/services/meta");
    const config = getMetaAppConfig();
    if (!config.appId) {
      return NextResponse.json({ error: "Meta App ID not configured. Set it in Settings." }, { status: 400 });
    }
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const scopes = ["ads_read", "business_management"].join(",");
    const url = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${config.appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}&response_type=code`;
    return NextResponse.json({ url, state });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
