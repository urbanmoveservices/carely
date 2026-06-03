import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { ok, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const user = await prisma.user.findUnique({
      where: { id: auth.payload.userId },
      select: {
        onboardingCompleted: true,
        name: true,
        _count: { select: { familyMembers: true, documents: true } },
      },
    });

    if (!user) return ok({ completed: false });

    return ok({
      completed: user.onboardingCompleted,
      name: user.name,
      familyMemberCount: user._count.familyMembers,
      documentCount: user._count.documents,
    });
  } catch (err) {
    console.error("Onboarding status error:", err);
    return serverError();
  }
}
