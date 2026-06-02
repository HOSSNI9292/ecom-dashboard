export function getImageUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("https://codinafrica.b-cdn.net/")) {
    return `/api/product-image?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export function getImageUrlOrFallback(url?: string): string {
  return getImageUrl(url) || "";
}
