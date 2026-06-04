import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { code, redirectUri, appId, appSecret } = await request.json();

    if (!code) {
      return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
    }
    if (!redirectUri) {
      return NextResponse.json({ error: "Missing redirectUri" }, { status: 400 });
    }
    if (!appId || !appSecret) {
      return NextResponse.json({ error: "Meta App ID and App Secret are required" }, { status: 400 });
    }

    const API_VERSION = "v25.0";
    const GRAPH_URL = `https://graph.facebook.com/${API_VERSION}`;

    const tokenUrl = `${GRAPH_URL}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`;
    const tokenRes = await fetch(tokenUrl);
    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      let msg = "Failed to exchange authorization code";
      try { const e = JSON.parse(errBody); msg = e.error?.message || msg; } catch {}
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const tokenData = await tokenRes.json();
    const shortToken = tokenData.access_token;

    const longTokenUrl = `${GRAPH_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`;
    const longRes = await fetch(longTokenUrl);
    if (!longRes.ok) {
      const errBody = await longRes.text();
      let msg = "Failed to exchange for long-lived token";
      try { const e = JSON.parse(errBody); msg = e.error?.message || msg; } catch {}
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const longData = await longRes.json();
    const accessToken = longData.access_token;
    const expiresAt = new Date(Date.now() + (longData.expires_in || 5184000) * 1000).toISOString();

    const accountsUrl = `${GRAPH_URL}/me/adaccounts?fields=id,name,currency,account_id,account_status&access_token=${accessToken}&limit=100`;
    const accountsRes = await fetch(accountsUrl);
    if (!accountsRes.ok) {
      const errBody = await accountsRes.text();
      let msg = "Failed to fetch ad accounts";
      try { const e = JSON.parse(errBody); msg = e.error?.message || msg; } catch {}
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const accountsData = await accountsRes.json();
    const accounts = (accountsData.data || []).map((a: any) => ({
      id: a.id,
      name: a.name || "Unnamed Account",
      currency: a.currency || "USD",
      accountId: a.account_id || "",
      status: a.account_status !== undefined ? (a.account_status === 1 ? "ACTIVE" : "INACTIVE") : "UNKNOWN",
    }));

    return NextResponse.json({ accessToken, expiresAt, accounts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
