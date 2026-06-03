import type { NextRequest } from "next/server";

const LOCAL_FALLBACK = "http://localhost:7111";

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function isHttpOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Server-side default when no request context (cron, scripts). */
export function getDefaultBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    LOCAL_FALLBACK
  );
}

/**
 * Resolve public app base URL from an incoming request.
 * Prefers ngrok / reverse-proxy headers so share links match the browser origin.
 */
export function getBaseUrlFromRequest(request: NextRequest): string {
  const origin = request.headers.get("origin");
  if (origin && isHttpOrigin(origin)) {
    return stripTrailingSlash(origin);
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    const host = forwardedHost.split(",")[0]?.trim();
    const proto = (forwardedProto?.split(",")[0]?.trim() || "https").replace(
      /:$/,
      ""
    );
    if (host) {
      return stripTrailingSlash(`${proto}://${host}`);
    }
  }

  const host = request.headers.get("host");
  if (host) {
    const h = host.split(",")[0]?.trim();
    const proto =
      forwardedProto?.split(",")[0]?.trim() ||
      (h.includes("localhost") || h.startsWith("127.0.0.1") ? "http" : "https");
    return stripTrailingSlash(`${proto.replace(/:$/, "")}://${h}`);
  }

  return getDefaultBaseUrl();
}
