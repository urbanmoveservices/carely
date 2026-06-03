/** Parse lab reference range strings into numeric bounds. */

export type ParsedReference = {
  referenceRange: string;
  referenceMin?: number;
  referenceMax?: number;
  qualitative?: boolean;
};

function parseNumber(s: string): number | undefined {
  const n = parseFloat(s.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : undefined;
}

export function parseReferenceRange(raw: string | null | undefined): ParsedReference | null {
  if (!raw?.trim()) return null;
  let text = raw.trim().replace(/\s+/g, " ");
  const original = text;

  const qual = /^(negative|positive|non[- ]?reactive|reactive|nil|absent|present)$/i.test(
    text.replace(/normal:\s*/i, "").trim()
  );
  if (qual) {
    return { referenceRange: original, qualitative: true };
  }

  text = text.replace(/^normal:\s*/i, "").trim();
  text = text.replace(/^up\s+to\s+/i, "< ");
  text = text.replace(/^upto\s+/i, "< ");

  // <100, < 100 mg/dL
  let m = text.match(/^<\s*([\d.]+)/);
  if (m) {
    const max = parseNumber(m[1]);
    return {
      referenceRange: original,
      referenceMax: max,
    };
  }

  // >40, >= 40
  m = text.match(/^>\s*=?\s*([\d.]+)/);
  if (m) {
    const min = parseNumber(m[1]);
    return { referenceRange: original, referenceMin: min };
  }

  // 0.27–4.20, 40-50, 40.00 - 50.00
  m = text.match(
    /^([\d.]+)\s*(?:–|-|to)\s*([\d.]+)/i
  );
  if (m) {
    const referenceMin = parseNumber(m[1]);
    const referenceMax = parseNumber(m[2]);
    return { referenceRange: original, referenceMin, referenceMax };
  }

  // Single target "100" treated as max only when preceded by up to already handled
  m = text.match(/^([\d.]+)\s*(?:mg|g|mmol|µ|u|mIU|%|\/)/i);
  if (m) {
    const n = parseNumber(m[1]);
    if (n != null) return { referenceRange: original, referenceMax: n };
  }

  return { referenceRange: original };
}
