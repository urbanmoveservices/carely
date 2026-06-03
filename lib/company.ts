/** Operator / company identifiers for legal copy and UI. */

import { BRAND } from "@/lib/brand";

export const COMPANY_NAME = BRAND.operator;
export const PRODUCT_NAME = BRAND.name;
export const PRODUCT_SHORT_NAME = BRAND.shortName;

export function getSupportEmail(): string {
  return (
    process.env.SUPPORT_EMAIL?.trim() ||
    process.env.APP_SUPPORT_EMAIL?.trim() ||
    "support@vaidya-gpt.com"
  );
}

/** @deprecated use getSupportEmail() */
export const SUPPORT_EMAIL = getSupportEmail();
export const LEGAL_EMAIL = "legal@urbanmoveservices.com";

/** Display date for legal pages (update when policies change). */
export const LEGAL_LAST_UPDATED = "May 26, 2026";

export const LEGAL_REVIEW_NOTE =
  "This page is a product/legal draft and should be reviewed by a qualified legal professional before production use.";

export const COMPLIANCE_NOTE =
  `${BRAND.name} is not certified as compliant with HIPAA, GDPR, DPDP, or similar healthcare privacy frameworks by default. Production deployment requires compliance review.`;
