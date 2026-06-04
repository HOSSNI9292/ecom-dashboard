import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { redirectUri, appId, appSecret } = await request.json();
    if (!redirectUri) {
      return NextResponse.json({ error: "Missing redirectUri" }, { status: 400 });
    }
    if (!appId || !appSecret) {
      return NextResponse.json({ error: "Meta App ID and App Secret are required. Set them in Settings." }, { status: 400 });
    }
    const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const payload = JSON.stringify({ appId, appSecret, nonce });
    const state = Buffer.from(payload).toString("base64");
    const scopes = ["ads_read", "business_management"].join(",");
    const url = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${encodeURIComponent(state)}&response_type=code`;
    return NextResponse.json({ url, state });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
