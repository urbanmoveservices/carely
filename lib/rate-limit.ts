interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  cleanup();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  entry.count++;
  if (entry.count > limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

// Preset rate limit configs
export const RATE_LIMITS = {
  OTP_SEND:           { limit: 5,   windowMs: 10 * 60 * 1000 },
  OTP_VERIFY:         { limit: 20,  windowMs: 10 * 60 * 1000 },
  OTP_FORGOT:         { limit: 5,   windowMs: 10 * 60 * 1000 },
  OTP_RESET:          { limit: 10,  windowMs: 10 * 60 * 1000 },
  SIGNUP:           { limit: 5,   windowMs: 10 * 60 * 1000 },
  LOGIN:            { limit: 10,  windowMs: 10 * 60 * 1000 },
  ADMIN_LOGIN:      { limit: 5,   windowMs: 10 * 60 * 1000 },
  UPLOAD:           { limit: 10,  windowMs: 60 * 60 * 1000 },
  GENERATE_SUMMARY: { limit: 20,  windowMs: 24 * 60 * 60 * 1000 },
  PDF_DOWNLOAD:     { limit: 50,  windowMs: 24 * 60 * 60 * 1000 },
  ADMIN_API:        { limit: 300, windowMs: 10 * 60 * 1000 },
  CHAT_BURST:       { limit: 20,  windowMs: 10 * 60 * 1000 },
  /** Per-user hourly cap on AI chat asks (abuse protection). */
  CHAT_HOURLY:      { limit: 60,  windowMs: 60 * 60 * 1000 },
} as const;

export function checkRateLimit(
  prefix: string,
  identifier: string,
  config: { limit: number; windowMs: number }
): RateLimitResult {
  return rateLimit(`${prefix}:${identifier}`, config.limit, config.windowMs);
}

/** Local/E2E accounts — avoid flaky test:all when smoke + e2e + qa share one dev server IP. */
export function shouldBypassAuthRateLimit(email: string): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const normalized = email.trim().toLowerCase();
  return (
    normalized.endsWith("@vaidya.test") ||
    process.env.E2E_BYPASS_RATE_LIMIT === "true"
  );
}
