import { checkRateLimit } from "@/lib/rate-limit";
import { getPlanLimits, normalizePlanKey, type PlanKey } from "@/lib/plans";

export function getCurrentDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function getChatBurstLimit(): number {
  const test = process.env.CHAT_TEST_BURST_LIMIT?.trim();
  if (test && /^\d+$/.test(test)) return Math.max(1, parseInt(test, 10));
  return 5;
}

export function getChatDailyLimitForPlan(plan: string | null | undefined): number {
  const key = normalizePlanKey(plan);
  const limits = getPlanLimits(key);
  return limits.chatMessagesPerDay;
}

export function checkChatBurstLimit(userId: string) {
  return checkRateLimit("chat-burst-min", userId, {
    limit: getChatBurstLimit(),
    windowMs: 60 * 1000,
  });
}

export function checkChatDailyLimit(userId: string, plan: string | null | undefined) {
  const dayKey = getCurrentDayKey();
  const limit = getChatDailyLimitForPlan(plan);
  return checkRateLimit(`chat-daily:${dayKey}`, userId, {
    limit,
    windowMs: 24 * 60 * 60 * 1000,
  });
}
