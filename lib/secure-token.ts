import { randomBytes } from "crypto";
import type { NextRequest } from "next/server";
import { getBaseUrlFromRequest, getDefaultBaseUrl } from "./url";

export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

/** @deprecated Prefer getBaseUrlFromRequest(req) in API routes */
export function getAppBaseUrl(request?: NextRequest): string {
  if (request) return getBaseUrlFromRequest(request);
  return getDefaultBaseUrl();
}

export function maskToken(token: string): string {
  if (token.length <= 8) return "****";
  return `${token.slice(0, 4)}…${token.slice(-4)}`;
}
