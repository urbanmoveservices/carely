import { getAppUrl } from "@/lib/app-url";

export function getAllowedOrigins(): string[] {
  const fromEnv = process.env.ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (fromEnv?.length) {
    return fromEnv.map((origin) => origin.replace(/\/+$/, ""));
  }

  if (process.env.NODE_ENV === "production") {
    return [getAppUrl()];
  }

  const origins = new Set<string>();
  try {
    origins.add(getAppUrl());
  } catch {
    /* ignore — env may be unset in some dev scripts */
  }
  return [...origins];
}
