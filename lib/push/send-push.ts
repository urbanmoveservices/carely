import prisma from "@/lib/prisma";
import { isPushConfigured } from "@/lib/env";

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string }
): Promise<{ sent: number; skipped?: boolean }> {
  if (!isPushConfigured()) {
    console.info(`[push:dev] ${userId}: ${payload.title} — ${payload.body}`);
    return { sent: 0, skipped: true };
  }

  const subs = await prisma.pushSubscription.findMany({
    where: { userId, isActive: true },
  });

  let sent = 0;
  for (const sub of subs) {
    try {
      await sendWebPush(sub, payload);
      sent += 1;
    } catch (err) {
      console.warn("[push] Failed for subscription:", sub.id, err);
    }
  }
  return { sent };
}

async function sendWebPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string }
): Promise<void> {
  const publicKey = process.env.VAPID_PUBLIC_KEY!;
  const privateKey = process.env.VAPID_PRIVATE_KEY!;
  const subject = process.env.VAPID_SUBJECT || "mailto:support@urbanmoveservices.com";

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/dashboard",
  });

  const crypto = await import("crypto");
  const url = new URL(sub.endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const jwtHeader = Buffer.from(
    JSON.stringify({ typ: "JWT", alg: "ES256" })
  ).toString("base64url");
  const jwtPayload = Buffer.from(
    JSON.stringify({
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + 12 * 3600,
      sub: subject,
    })
  ).toString("base64url");

  const unsigned = `${jwtHeader}.${jwtPayload}`;
  const sign = crypto.createSign("SHA256");
  sign.update(unsigned);
  sign.end();
  const derSig = sign.sign({ key: privateKey, dsaEncoding: "ieee-p1363" });
  const jwt = `${unsigned}.${derSig.toString("base64url")}`;

  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${publicKey}`,
      "Content-Type": "application/octet-stream",
      TTL: "86400",
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`Push failed: ${res.status}`);
  }
}
