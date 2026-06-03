import { getAppDisplayName } from "@/lib/brand";
import { getAppUrl } from "@/lib/app-url";

export const APP_NAME = getAppDisplayName();

/** @deprecated Use getAppUrl() from @/lib/app-url */
export const APP_URL = getAppUrl();

export const UPLOAD_STATUSES = {
  UPLOADED: "uploaded",
  PROCESSING: "processing",
  TEXT_EXTRACTED: "text_extracted",
  GENERATING_SUMMARY: "generating_summary",
  AI_COMPLETED: "ai_completed",
  SUMMARY_FAILED: "summary_failed",
  FAILED: "failed",
} as const;

export const STATUS_LABELS: Record<string, string> = {
  uploaded: "Uploaded",
  processing: "Extracting text",
  text_extracted: "Text extracted",
  generating_summary: "Generating summary",
  ai_completed: "AI completed",
  summary_failed: "Summary failed",
  failed: "Failed",
};

export const ROLES = {
  USER: "user",
  ADMIN: "admin",
} as const;

export const TOKEN_KEY = "carely_token";
export const ADMIN_TOKEN_KEY = "carely_admin_token";
