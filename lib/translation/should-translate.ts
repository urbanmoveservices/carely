/** Fields to skip when translating JSON objects */
export const SKIP_OBJECT_KEYS = new Set([
  "id",
  "userId",
  "documentId",
  "reportId",
  "familyMemberId",
  "email",
  "url",
  "href",
  "token",
  "password",
  "accessToken",
  "refreshToken",
  "storagePath",
  "fileName",
  "filename",
  "originalFilename",
  "original_filename",
  "createdAt",
  "created_at",
  "updatedAt",
  "updated_at",
  "expiresAt",
  "access_token",
  "user_id",
  "document_id",
  "report_id",
  "familyMemberId",
  "fileType",
  "file_type",
  "fileSize",
  "file_size",
  "uploadStatus",
  "upload_status",
  "shareUrl",
  "share_url",
  "publicToken",
  "aiModelUsed",
  "processingTimeMs",
  "monthKey",
  "role",
  "currentPlan",
  "plan",
  "code",
  "level",
  "status",
  "severity",
  "value",
  "normalMin",
  "normalMax",
  "unit",
  "healthScore",
]);

const UNIT_PATTERN =
  /\b(mg\/dL|mg\/dl|mmHg|ng\/mL|ng\/ml|g\/dL|g\/dl|mL|ml|mmol\/L|%)\b/i;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_PATTERN = /^https?:\/\//i;
const FILENAME_PATTERN = /\.(pdf|jpg|jpeg|png|docx|txt)$/i;
const NUMBERS_ONLY = /^[\d\s.,:+\-/()%]+$/;
const CUID_UUID_PATTERN =
  /^(c[a-z0-9]{24}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
const TOKEN_LIKE = /^[A-Za-z0-9_-]{20,}$/;
const STORAGE_PATH = /^(uploads\/|documents\/|reports\/)/i;
const ISO_DATE_ONLY =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;

export function normalizeSourceText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function shouldSkipTextTranslation(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (t.length < 2) return true;
  if (NUMBERS_ONLY.test(t)) return true;
  if (EMAIL_PATTERN.test(t)) return true;
  if (URL_PATTERN.test(t)) return true;
  if (FILENAME_PATTERN.test(t)) return true;
  if (/^(carely-med-gen-ai|vaidya-gpt)-report-[\w-]+\.pdf$/i.test(t)) return true;
  if (CUID_UUID_PATTERN.test(t)) return true;
  if (TOKEN_LIKE.test(t) && !/\s/.test(t)) return true;
  if (STORAGE_PATH.test(t)) return true;
  if (ISO_DATE_ONLY.test(t)) return true;
  if (UNIT_PATTERN.test(t) && t.length < 30) return true;
  return false;
}

export function shouldSkipObjectKey(key: string): boolean {
  return SKIP_OBJECT_KEYS.has(key);
}

export function shouldCacheTranslation(text: string): boolean {
  return !shouldSkipTextTranslation(text);
}
