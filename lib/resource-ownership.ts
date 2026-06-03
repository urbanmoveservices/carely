import { forbidden, notFound } from "@/lib/api-response";
import type { NextResponse } from "next/server";

type OwnsResource = { userId: string } | null | undefined;

/**
 * Ensures a resource belongs to the authenticated user.
 * Returns 404 when missing (avoid leaking existence) and 403 when mismatched.
 */
export function assertOwnsResource(
  resource: OwnsResource,
  userId: string,
  label = "Resource"
): NextResponse | null {
  if (!resource) return notFound(`${label} not found`);
  if (resource.userId !== userId) return forbidden("Access denied");
  return null;
}
