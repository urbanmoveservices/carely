import prisma from "@/lib/prisma";

export type PostProcessingDelegateName =
  | "healthRisk"
  | "reminderSuggestion"
  | "appNotification"
  | "labTrendRecord"
  | "familyTimelineEvent";

export const POST_PROCESSING_DELEGATES: PostProcessingDelegateName[] = [
  "healthRisk",
  "reminderSuggestion",
  "appNotification",
  "labTrendRecord",
  "familyTimelineEvent",
];

export function hasPrismaDelegate(name: PostProcessingDelegateName): boolean {
  const delegate = (prisma as unknown as Record<string, unknown>)[name];
  return (
    delegate != null &&
    typeof delegate === "object" &&
    typeof (delegate as { findMany?: unknown }).findMany === "function"
  );
}

export function isPostProcessingSchemaReady(): boolean {
  return POST_PROCESSING_DELEGATES.every(hasPrismaDelegate);
}

export function warnMissingDelegate(name: PostProcessingDelegateName): void {
  if (hasPrismaDelegate(name)) return;
  const msg = `Prisma delegate ${name} missing. Run npx prisma generate and restart dev server.`;
  console.warn(`[prisma] ${msg}`);
}

export function getStaleClientWarning(): string | undefined {
  if (isPostProcessingSchemaReady()) return undefined;
  return "Post-processing tables unavailable until Prisma client is regenerated. Stop dev server, run npx prisma generate, then npm run dev.";
}

export function hasHealthRiskDelegate(): boolean {
  return hasPrismaDelegate("healthRisk");
}

export function hasReminderSuggestionDelegate(): boolean {
  return hasPrismaDelegate("reminderSuggestion");
}

export function hasAppNotificationDelegate(): boolean {
  return hasPrismaDelegate("appNotification");
}

export function hasLabTrendRecordDelegate(): boolean {
  return hasPrismaDelegate("labTrendRecord");
}

export function hasFamilyTimelineEventDelegate(): boolean {
  return hasPrismaDelegate("familyTimelineEvent");
}

export function hasAiUsageLogDelegate(): boolean {
  const delegate = (prisma as unknown as Record<string, unknown>).aiUsageLog;
  return (
    delegate != null &&
    typeof delegate === "object" &&
    typeof (delegate as { create?: unknown }).create === "function"
  );
}

export function hasAiResponseCacheDelegate(): boolean {
  const delegate = (prisma as unknown as Record<string, unknown>).aiResponseCache;
  return (
    delegate != null &&
    typeof delegate === "object" &&
    typeof (delegate as { findUnique?: unknown }).findUnique === "function"
  );
}
