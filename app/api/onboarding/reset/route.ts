import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { ok, serverError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    await prisma.user.update({
      where: { id: auth.payload.userId },
      data: { onboardingCompleted: false },
    });

    return ok({ success: true, onboardingCompleted: false });
  } catch (err) {
    console.error("Onboarding reset error:", err);
    return serverError();
  }
}
