/** Map API/upload status codes to translation keys */
export const UPLOAD_STATUS_KEYS: Record<string, string> = {
  uploaded: "status.uploaded",
  processing: "status.processing",
  text_extracted: "status.textExtracted",
  ai_completed: "status.aiCompleted",
  failed: "status.failed",
};

export const METRIC_STATUS_KEYS: Record<string, string> = {
  normal: "status.normal",
  low: "status.low",
  high: "status.high",
  critical: "status.critical",
  moderate: "status.moderate",
  unknown: "status.unknown",
};

export function translateUploadStatus(
  t: (key: string, fallback?: string) => string,
  status: string
): string {
  const key = UPLOAD_STATUS_KEYS[status];
  if (!key) return status;
  const text = t(key);
  return text === key ? status : text;
}

export function translateMetricStatus(
  t: (key: string, fallback?: string) => string,
  status: string
): string {
  const key = METRIC_STATUS_KEYS[status];
  if (!key) return status;
  const text = t(key);
  return text === key ? status : text;
}

const SEVERITY_KEYS: Record<string, string> = {
  low: "status.low",
  moderate: "status.moderate",
  high: "status.high",
  critical: "status.critical",
  unknown: "status.unknown",
};

export function translateSeverityLabel(
  t: (key: string, fallback?: string) => string,
  severity: string
): string {
  const key = SEVERITY_KEYS[severity];
  if (!key) return severity;
  const text = t(key);
  return text === key ? severity : text;
}
