import type { User as PrismaUser } from "@prisma/client";
import { evaluateProfileCompletion } from "@/lib/profile";

export const DEMO_USER_EMAIL = "demo@carelymed.ai";

export function serializeUser(user: PrismaUser) {
  const flags = evaluateProfileCompletion(user);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as "user" | "admin",
    createdAt: user.createdAt.toISOString(),
    onboardingCompleted: user.onboardingCompleted,
    emailVerified: user.emailVerified,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    currentPlan: user.currentPlan,
    subscriptionStatus: user.subscriptionStatus,
    isDemo: user.email.toLowerCase() === DEMO_USER_EMAIL,
    billingProfileCompleted: flags.billingProfileCompleted,
    profileCompleted: flags.profileCompleted,
  };
}
