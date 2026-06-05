/** Health-safe email subject rules — no lab markers, diagnoses, or abnormal wording. */

const FORBIDDEN_SUBJECT_PATTERNS: RegExp[] = [
  /\b(tsh|hba1c|ldl|hdl|triglycerides|hemoglobin|hb|pcv|vitamin\s*d|thyroid|diabetes|cholesterol)\b/i,
  /\b(high|low|abnormal|critical|elevated|deficient)\b/i,
  /\b(heart\s*disease|thyroid\s*disease|cancer|anemia|hypertension)\b/i,
];

export function sanitizeEmailSubject(subject: string): string {
  let s = subject.trim();
  for (const pattern of FORBIDDEN_SUBJECT_PATTERNS) {
    if (pattern.test(s)) {
      s = s.replace(pattern, "").replace(/\s{2,}/g, " ").trim();
    }
  }
  if (!s || FORBIDDEN_SUBJECT_PATTERNS.some((p) => p.test(s))) {
    return "Message from Vaidya GPT";
  }
  return s.slice(0, 200);
}

export function isSubjectHealthSafe(subject: string): boolean {
  return !FORBIDDEN_SUBJECT_PATTERNS.some((p) => p.test(subject));
}

export function sanitizeEmailBodyText(text: string): string {
  return text
    .replace(/\b(TSH|HbA1c|LDL|HDL|fasting\s*glucose)\s*[:=]?\s*[\d.]+\s*\w*/gi, "[lab value — view in app]")
    .slice(0, 8000);
}
