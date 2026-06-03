function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function getAppUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    (process.env.NODE_ENV === "production"
      ? ""
      : "http://localhost:7111");

  if (!url) {
    throw new Error(
      "APP_URL or NEXT_PUBLIC_APP_URL must be set in production"
    );
  }

  return normalizeUrl(url);
}

export function absoluteUrl(path = "/"): string {
  const base = getAppUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

export function getBaseUrlFromRequest(req?: Request): string {
  if (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.PUBLIC_APP_URL
  ) {
    return getAppUrl();
  }

  if (req) {
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const host =
      req.headers.get("x-forwarded-host") || req.headers.get("host");
    if (host) return `${proto}://${host}`.replace(/\/+$/, "");
  }

  return getAppUrl();
}

export function isAppUrlConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      process.env.APP_URL?.trim() ||
      process.env.PUBLIC_APP_URL?.trim() ||
      process.env.VERCEL_URL?.trim()
  );
}
