export type EmailTemplateKey =
  | "email_verification_otp"
  | "password_reset_otp"
  | "report_upload_received"
  | "ai_summary_ready"
  | "ai_summary_failed"
  | "payment_success"
  | "payment_failed"
  | "doctor_share_created"
  | "welcome_verified"
  | "first_report_upload_reminder"
  | "onboarding_incomplete"
  | "report_awaiting_summary"
  | "inactive_3_days"
  | "inactive_7_days"
  | "family_setup_reminder"
  | "plan_limit_reached"
  | "reminder_due"
  | "monthly_health_newsletter"
  | "new_feature_chatbot"
  | "new_feature_nutrition"
  | "family_plan_promo"
  | "pro_plan_promo"
  | "email_verification"
  | "password_reset"
  | "doctor_share"
  | "caregiver_invite"
  | "reminder"
  | "monthly_digest"
  | "support_ticket";

export type EmailCategory = "transactional" | "lifecycle" | "marketing";

export function categoryForTemplate(key: EmailTemplateKey): EmailCategory {
  if (
    key.includes("newsletter") ||
    key.includes("promo") ||
    key.includes("new_feature")
  ) {
    return "marketing";
  }
  if (
    key === "welcome_verified" ||
    key.startsWith("first_") ||
    key.startsWith("onboarding") ||
    key.startsWith("inactive") ||
    key.startsWith("family_setup") ||
    key === "report_awaiting_summary" ||
    key === "plan_limit_reached"
  ) {
    return "lifecycle";
  }
  return "transactional";
}
