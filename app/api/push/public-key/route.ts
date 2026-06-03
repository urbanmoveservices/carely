import { NextResponse } from "next/server";
import { isPushConfigured } from "@/lib/env";

export async function GET() {
  const configured = isPushConfigured();
  return NextResponse.json({
    configured,
    publicKey: configured ? process.env.VAPID_PUBLIC_KEY : null,
  });
}
