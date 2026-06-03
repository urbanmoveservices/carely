/** Normalize Indian mobile numbers to E.164 +91XXXXXXXXXX */

const INDIAN_MOBILE = /^(\+91|91)?[6-9]\d{9}$/;

export function normalizeIndianPhone(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  let digits = input.trim().replace(/[\s\-().]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("91") && digits.length === 12) {
    digits = digits.slice(2);
  }
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("91") && INDIAN_MOBILE.test(`91${digits.slice(2)}`)) {
    return `+${digits}`;
  }
  return null;
}

/** Razorpay Checkout `contact` — 10-digit Indian mobile without country code */
export function formatPhoneForRazorpay(phone: string | null | undefined): string | null {
  const normalized = normalizeIndianPhone(phone);
  if (!normalized) return null;
  return normalized.replace(/^\+91/, "");
}

export function isValidIndianPhone(input: string | null | undefined): boolean {
  return normalizeIndianPhone(input) !== null;
}
