import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400, code?: string) {
  const body: Record<string, unknown> = { error: message };
  if (code) body.code = code;
  return NextResponse.json(body, { status });
}

export function failWithMeta(
  message: string,
  status: number,
  meta: Record<string, unknown>
) {
  return NextResponse.json({ error: message, ...meta }, { status });
}

export function unauthorized(message = "Unauthorized") {
  return fail(message, 401, "UNAUTHORIZED");
}

export function forbidden(message = "Access denied") {
  return fail(message, 403, "FORBIDDEN");
}

export function notFound(message = "Not found") {
  return fail(message, 404, "NOT_FOUND");
}

export function validationError(message: string) {
  return fail(message, 400, "VALIDATION_ERROR");
}

export function rateLimited(message = "Too many requests. Please try again later.") {
  return fail(message, 429, "RATE_LIMITED");
}

export function serverError(message = "Internal server error") {
  return fail(message, 500, "SERVER_ERROR");
}

export function serviceUnavailable(message: string, code?: string) {
  return fail(message, 503, code || "SERVICE_UNAVAILABLE");
}
