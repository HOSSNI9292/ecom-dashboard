import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return new Response(
      `<html><body><script>
        window.opener?.postMessage({ type: 'meta_oauth_error', error: '${error}' }, '*');
        window.close();
      </script></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  if (!code) {
    return new Response(
      `<html><body><script>
        window.opener?.postMessage({ type: 'meta_oauth_error', error: 'No authorization code received' }, '*');
        window.close();
      </script></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  return new Response(
    `<html><body><script>
      window.opener?.postMessage({
        type: 'meta_oauth_code',
        data: { code: '${code}', state: '${state || ""}' }
      }, '*');
      window.close();
    </script></body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
