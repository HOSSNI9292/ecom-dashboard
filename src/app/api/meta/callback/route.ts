import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const error = request.nextUrl.searchParams.get("error");

    if (error) {
      return new Response(
        `<html><body><script>window.opener?.postMessage({ type: 'meta_oauth_error', error: '${error}' }, '*'); window.close();</script></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    if (!code) {
      return new Response(
        `<html><body><script>window.opener?.postMessage({ type: 'meta_oauth_error', error: 'No authorization code received' }, '*'); window.close();</script></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    let appId = "";
    let appSecret = "";
    if (state) {
      try {
        const decoded = JSON.parse(Buffer.from(state, "base64").toString());
        appId = decoded.appId || "";
        appSecret = decoded.appSecret || "";
      } catch { /* state not ours, fall back */ }
    }

    if (!appId || !appSecret) {
      const { getMetaAppConfig } = await import("@/services/meta");
      const config = getMetaAppConfig();
      appId = config.appId;
      appSecret = config.appSecret;
    }

    if (!appId) {
      return new Response(
        `<html><body><script>window.opener?.postMessage({ type: 'meta_oauth_error', error: 'Meta App ID not configured. Set it in Settings.' }, '*'); window.close();</script></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    const origin = request.nextUrl.origin;
    const redirectUri = `${origin}/api/meta/callback`;

    const { exchangeCodeForToken, exchangeShortLivedToken, fetchAdAccounts } = await import("@/services/meta");

    const { accessToken: shortToken } = await exchangeCodeForToken(code, redirectUri, appId, appSecret);

    const { accessToken, expiresAt } = await exchangeShortLivedToken(shortToken, appId, appSecret);

    const accounts = await fetchAdAccounts(accessToken);

    return new Response(
      `<html><body><script>
        window.opener?.postMessage({
          type: 'meta_oauth_success',
          data: {
            accessToken: '${accessToken}',
            expiresAt: '${expiresAt}',
            accounts: ${JSON.stringify(accounts)}
          }
        }, '*');
        window.close();
      </script></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      `<html><body><script>
        window.opener?.postMessage({ type: 'meta_oauth_error', error: '${message.replace(/'/g, "\\'")}' }, '*');
        window.close();
      </script></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }
}
