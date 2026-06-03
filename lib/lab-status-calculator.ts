import type { ParsedReference } from "@/lib/lab-reference-parser";

export type LabStatus = "high" | "low" | "normal" | "unknown";

export function calculateLabStatus(
  numericValue: number | undefined,
  ref: ParsedReference | null
): LabStatus {
  if (numericValue == null || !Number.isFinite(numericValue)) return "unknown";
  if (!ref || ref.qualitative) return "unknown";

  const { referenceMin, referenceMax } = ref;
  const hasMin = referenceMin != null && Number.isFinite(referenceMin);
  const hasMax = referenceMax != null && Number.isFinite(referenceMax);

  if (!hasMin && !hasMax) return "unknown";

  if (hasMax && !hasMin) {
    if (numericValue > referenceMax!) return "high";
    return "normal";
  }

  if (hasMin && !hasMax) {
    if (numericValue < referenceMin!) return "low";
    return "normal";
  }

  if (hasMin && hasMax) {
    if (numericValue < referenceMin!) return "low";
    if (numericValue > referenceMax!) return "high";
    return "normal";
  }

  return "unknown";
}
