export type QaSeedItem = {
  group: string;
  key: string;
  title: string;
  description?: string;
};

export const QA_CHECKLIST_GROUPS: { id: string; label: string }[] = [
  { id: "branding", label: "Branding" },
  { id: "auth", label: "Auth" },
  { id: "onboarding", label: "Onboarding" },
  { id: "upload", label: "Upload" },
  { id: "ocr", label: "OCR / Text extraction" },
  { id: "ai_summary", label: "AI Summary" },
  { id: "report", label: "Report page" },
  { id: "chat", label: "Safe AI Chatbot" },
  { id: "health_risk", label: "Health Risk Dashboard" },
  { id: "family", label: "Family" },
  { id: "reminders", label: "Reminders" },
  { id: "language", label: "Language / Translation" },
  { id: "billing", label: "Billing / Razorpay" },
  { id: "admin", label: "Admin" },
  { id: "security", label: "Security / privacy" },
  { id: "pwa", label: "PWA / mobile" },
  { id: "production", label: "Production" },
];

function item(
  group: string,
  key: string,
  title: string,
  description?: string
): QaSeedItem {
  return { group, key, title, description };
}

/** Default QA checklist — seeded when empty or on POST /api/admin/qa-checklist/seed */
export const QA_CHECKLIST_ITEMS: QaSeedItem[] = [
  // Branding
  item("branding", "brand_landing", "Vaidya GPT on landing", "Homepage shows logo and Vaidya GPT"),
  item("branding", "brand_dashboard", "Vaidya GPT on dashboard", "Header shows Vaidya GPT"),
  item("branding", "brand_auth", "Vaidya GPT on auth pages", "Login/signup show logo and name"),
  item("branding", "brand_pdf", "Vaidya GPT in report PDF", "Downloaded PDF header uses Vaidya GPT"),
  item("branding", "brand_no_old_name", "No Carely-Med in UI", "Old product name not visible in UI"),
  item("branding", "brand_logo_pwa", "Logo in header and PWA", "logo.png / manifest icons present"),

  // Auth
  item("auth", "signup_works", "Signup works", "New account can register"),
  item("auth", "signup_consent", "Signup consent required", "Cannot submit without legal consent"),
  item("auth", "login_works", "Login works", "Valid credentials reach dashboard"),
  item("auth", "logout_works", "Logout works", "Session cleared after logout"),
  item("auth", "verify_email", "Email verification OTP", "6-digit code verifies email"),
  item("auth", "verify_email_otp_sent", "Verification OTP sent", "Signup/resend sends code email"),
  item("auth", "verify_email_resend_cooldown", "Resend verification cooldown", "Resend blocked for OTP_RESEND_COOLDOWN_SECONDS"),
  item("auth", "forgot_password", "Forgot password OTP", "Request reset code — generic response"),
  item("auth", "reset_password", "Reset password with OTP", "Code + new password resets account"),
  item("auth", "forgot_password_generic", "Unknown email generic", "Forgot password does not reveal account existence"),
  item("auth", "otp_attempts_limited", "OTP attempts limited", "Wrong code increments attempts; max blocks verify"),
  item("auth", "otp_hashed_storage", "OTP hashed at rest", "EmailOtp.codeHash only — no plain OTP in DB"),
  item("auth", "smtp_configured", "SMTP configured", "System health shows SMTP configured"),
  item("auth", "admin_login", "Admin login", "Admin reaches /admin"),
  item("auth", "non_admin_blocked", "Non-admin blocked", "User role cannot access admin APIs"),

  // Onboarding
  item("onboarding", "onboarding_new_user", "New user sees onboarding", "After signup, onboarding available"),
  item("onboarding", "onboarding_skip", "Skip works", "Skip does not trap user"),
  item("onboarding", "onboarding_dashboard", "Go dashboard works", "Complete/skip lands on dashboard"),
  item("onboarding", "onboarding_no_loop", "No redirect loop", "Completed onboarding stays off /onboarding"),
  item("onboarding", "onboarding_family", "Add family in onboarding", "Family step saves member"),
  item("onboarding", "onboarding_upload_optional", "Upload step optional", "Can skip upload step"),
  item("onboarding", "onboarding_refresh", "Dashboard refresh stable", "Refresh on dashboard stays"),

  // Upload
  item("upload", "upload_pdf", "PDF upload", "PDF uploads and extracts"),
  item("upload", "upload_docx", "DOCX upload", "Word document uploads"),
  item("upload", "upload_single_image", "Single image upload", "One image page works"),
  item("upload", "upload_multi_image", "Multi-image upload", "Multiple images one report"),
  item("upload", "free_3_pages", "Free 3-page limit", "Free blocks 4+ image pages"),
  item("upload", "pro_20_pages", "Pro 20-page limit", "Pro/Family allows up to 20 pages"),
  item("upload", "multi_counts_one_upload", "Multi-image = 1 upload", "One multi report = 1 monthly upload"),
  item("upload", "bad_type_blocked", "Wrong file type blocked", "Invalid extension rejected"),
  item("upload", "large_file_blocked", "Large file blocked", "Over MAX_UPLOAD_MB rejected"),
  item("upload", "upload_errors_clean", "Clean upload errors", "No Prisma/raw paths in UI"),

  // OCR
  item("ocr", "ocr_pdf_text", "PDF text extraction", "PDF text extracted without crash"),
  item("ocr", "ocr_docx", "DOCX extraction", "DOCX text extracted"),
  item("ocr", "ocr_openai_vision", "OpenAI Vision OCR", "Images use OpenAI Vision primary"),
  item("ocr", "ocr_tesseract_safe", "Tesseract safe", "ENABLE_TESSERACT_OCR=false does not crash server"),
  item("ocr", "ocr_multi_order", "Multi-image page order", "Combined text has page markers in order"),
  item("ocr", "ocr_partial_fail", "Partial OCR failure", "One bad page does not kill whole upload"),
  item("ocr", "ocr_rerun", "Re-run OCR", "Rerun OCR endpoint works"),
  item("ocr", "ocr_ui_message", "OCR UI messaging", "Upload shows OpenAI Vision note"),

  // AI Summary
  item("ai_summary", "ai_key_required", "OPENAI_API_KEY required", "Missing key shows AI_NOT_CONFIGURED"),
  item("ai_summary", "ai_short_text", "Short text error", "Too little text shows TEXT_NOT_READY"),
  item("ai_summary", "ai_context_form", "Context questionnaire", "Generate opens context form"),
  item("ai_summary", "ai_skip_context", "Skip context", "Can skip questionnaire"),
  item("ai_summary", "ai_real_text", "Uses extractedText", "Summary reflects uploaded content"),
  item("ai_summary", "ai_no_mock_flow", "No mock in user flow", "MOCK_AI_MODE off for real users"),
  item("ai_summary", "ai_no_fixed_score", "No fixed health score", "Not always 70/72"),
  item("ai_summary", "ai_unique_reports", "Different reports differ", "Distinct uploads → distinct summaries"),
  item("ai_summary", "ai_user_isolation", "Report data isolated", "User A cannot see User B reports"),
  item("ai_summary", "structured_lab_parser", "Structured lab parser", "OCR text → canonical lab values with status"),
  item("ai_summary", "ai_summary_structured_values", "Summary uses parsed values", "Prompt includes structured values; no generic Unknown"),
  item("ai_summary", "unknown_values_prevented", "Unknown values prevented", "Validator/repair blocks Thyroid/Cholesterol Unknown when TSH/LDL parsed"),
  item("ai_summary", "health_score_server_side", "Health score server-side", "Score computed from structured abnormal values, not OpenAI only"),
  item("ai_summary", "health_score_universal_engine", "Universal health score engine", "Abnormal structured values reduce score with group caps"),
  item("ai_summary", "health_score_factors_shown", "Score factors shown", "Report page explains deductions when score < 100"),
  item("ai_summary", "health_score_egfr_normal", "Normal eGFR not flagged", "eGFR >= 90 does not reduce score or create warning risk"),
  item("ai_summary", "health_score_source_stored", "Score source stored", "structured_lab_values vs ai_fallback on Report"),
  item("ai_summary", "risk_cards_deduplicated", "Risk cards deduplicated", "canonicalRiskKey upsert; specific marker titles"),
  item("ai_summary", "risk_dedupe_universal", "Risk dedupe universal", "Liver enzyme group; no duplicate marker cards"),
  item("ai_summary", "reports_repair_script", "Repair existing reports", "npm run reports:repair-values"),
  item("ai_summary", "report_context_separated", "Report vs user context", "Uploaded report vs questionnaire wording separated"),
  item("ai_summary", "ai_token_optimization", "Token optimization layer", "Compact context, cache, local answers, usage logging"),
  item("ai_summary", "ai_compact_context", "Compact report context", "Structured lab values sent; not full extractedText by default"),
  item("ai_summary", "ai_response_cache", "AI response cache", "Same report question uses cached response"),
  item("ai_summary", "ai_local_answer_engine", "Local answer engine", "IFCT nutrition and lab lookups without OpenAI"),
  item("ai_summary", "recommendations_5_7_limit", "Food/exercise/lifestyle 5–7", "Each section trimmed to 5–7 high-quality points"),
  item("ai_summary", "indian_diet_recommendations", "Indian diet aware", "Roti, dal, sabzi examples; not generic western-only"),
  item("ai_summary", "weather_location_recommendations", "Weather/location aware", "Exercise adapts when context exists; no invented weather"),
  item("ai_summary", "ai_usage_logging", "AI usage logging", "AiUsageLog records tokens, cache, and local answers"),
  item("admin", "admin_ai_usage_page", "Admin AI usage dashboard", "/admin/ai-usage shows token stats"),

  // Report
  item("report", "report_summary", "Summary visible", "Report page shows summary"),
  item("report", "report_findings", "Key findings", "Key findings section populated"),
  item("report", "report_abnormal", "Abnormal values", "Abnormal values listed"),
  item("report", "report_charts", "Charts", "Charts render"),
  item("report", "report_context", "Context insights", "Questionnaire insights when present"),
  item("report", "report_pdf", "PDF download", "Report PDF downloads"),
  item("report", "report_share", "Doctor share", "Share link created"),
  item("report", "report_questions", "Doctor questions", "Questions generated"),
  item("report", "report_doctor_pack", "Doctor pack", "Visit pack page/PDF"),
  item("report", "report_chat_translate", "Chat & translation", "Report chat and translate work"),

  // Chatbot
  item("chat", "chat_global", "Global AI chat", "POST /api/chat/ask general mode works"),
  item("chat", "chat_report", "Report chat", "Report-scoped chat answers from saved report"),
  item("chat", "chat_family", "Family health chat", "Family mode uses saved family data"),
  item("chat", "chat_history", "Chat history", "Thread list and detail load for user"),
  item("chat", "chat_new", "New chat", "New chat starts fresh thread in same mode"),
  item("chat", "chat_delete", "Delete chat", "User can delete own thread"),
  item("chat", "chat_retry", "Retry failed answer", "Failed AI response can be retried"),
  item("chat", "chat_sources", "Clickable source badges", "Sources link to report/family/risk pages"),
  item("chat", "chat_language", "Hindi/Hinglish chat", "Replies follow selected or app language"),
  item("chat", "chat_rate_limit", "Chat rate limit", "Burst and daily limits return proper codes"),
  item("chat", "chat_isolation", "Chat data isolation", "User B cannot access User A threads/reports"),
  item("chat", "chat_safety", "Chat safety guardrails", "No diagnose/prescribe; emergency urgent"),
  item("chat", "chat_support", "Support chatbot works", "Help chat answers app usage only"),
  item("chat", "chat_emergency", "Emergency safety response", "Chest pain etc. advises urgent care"),
  item("chat", "chat_no_diagnosis", "No diagnosis wording", "System prompt blocks disease diagnosis claims"),
  item("chat", "chat_no_prescribe", "No prescription wording", "Medicine questions defer to doctor"),

  // Health risks
  item("health_risk", "risk_after_summary", "Risks after summary", "Risks created post AI summary"),
  item("health_risk", "risk_page", "/health-risks cards", "Risk cards visible"),
  item("health_risk", "risk_dashboard", "Dashboard top risks", "Dashboard shows risks"),
  item("health_risk", "risk_report_page", "Report page risks", "Detected risks on report"),
  item("health_risk", "risk_family", "Family page risks", "Family member risks"),
  item("health_risk", "risk_dismiss", "Dismiss risk", "Dismiss updates status"),
  item("health_risk", "risk_resolve", "Resolve risk", "Resolve updates status"),
  item("health_risk", "risk_backfill", "Backfill script", "reports:backfill works"),
  item("health_risk", "risk_no_diagnosis", "No diagnosis wording", "Copy is informational only"),

  // Family
  item("family", "family_add", "Add member", "Create family member"),
  item("family", "family_edit", "Edit member", "Update member profile"),
  item("family", "family_link_report", "Link report", "Report linked to member"),
  item("family", "family_conditions", "Conditions", "CRUD conditions"),
  item("family", "family_allergies", "Allergies", "CRUD allergies"),
  item("family", "family_meds", "Medicines", "CRUD medications"),
  item("family", "family_vitals", "Vitals", "Log vitals"),
  item("family", "family_appointments", "Appointments", "Appointments list"),
  item("family", "family_emergency", "Emergency contacts", "Emergency contacts"),
  item("family", "family_timeline", "Timeline", "Timeline events"),
  item("family", "family_lab_trends", "Lab trends", "Trend charts"),
  item("family", "family_compare", "Report comparison", "Compare two reports"),

  // Reminders
  item("reminders", "reminder_create", "Create reminder", "New reminder saved"),
  item("reminders", "reminder_repeat", "Repeat schedules", "Daily/weekly/monthly"),
  item("reminders", "reminder_done", "Mark done", "Complete reminder"),
  item("reminders", "reminder_skip", "Skip", "Skip reminder"),
  item("reminders", "suggestion_accept", "Accept suggestion", "Follow-up suggestion accept"),
  item("reminders", "suggestion_dismiss", "Dismiss suggestion", "Follow-up dismiss"),
  item("reminders", "dashboard_tasks", "Dashboard today tasks", "Today tasks update"),

  // Language
  item("language", "lang_hindi_ui", "Hindi dashboard", "UI translates without full refresh"),
  item("language", "lang_report_openai", "Report OpenAI translate", "Report content translates"),
  item("language", "lang_regional", "Regional languages", "BN/TA/TE core pages"),
  item("language", "lang_rtl", "Urdu RTL", "RTL layout does not break"),
  item("language", "lang_back_en", "Back to English", "Restores original text"),
  item("language", "lang_no_toast_spam", "No toast spam", "Translation does not flood toasts"),
  item("language", "lang_consent", "Translation consent", "Settings consent gate"),
  item("language", "lang_cache", "Translation cache", "Repeated translate uses cache"),

  // Profile
  item("billing", "profile_page", "Profile page", "Settings profile saves hospital details"),
  item("billing", "profile_phone", "Phone saved", "Indian phone normalized"),
  item("billing", "profile_billing_gate", "Billing profile for Razorpay", "Phone required before checkout"),
  item("billing", "razorpay_prefill", "Razorpay prefill", "Checkout prefill has contact"),
  item("billing", "doctor_pack_profile", "Doctor pack patient", "Uses account holder profile"),

  // Billing
  item("billing", "billing_free_limits", "Free limits", "Upload/summary limits enforced"),
  item("billing", "billing_razorpay_checkout", "Razorpay checkout", "Checkout opens for Pro/Family"),
  item("billing", "billing_razorpay_verify", "Payment verification", "Valid signature activates plan"),
  item("billing", "billing_payment_history", "Payment history", "Verified payments listed on /billing"),
  item("billing", "billing_usage_counters", "Usage counters", "Counters match usage"),
  item("billing", "billing_image_limits", "Image page limits", "Plan page limits correct"),
  item("billing", "billing_invalid_signature", "Invalid signature rejected", "Bad verify returns PAYMENT_SIGNATURE_INVALID"),

  // Admin
  item("admin", "admin_dashboard", "Admin overview", "/admin loads"),
  item("admin", "admin_users", "Users page", "List and detail"),
  item("admin", "admin_documents", "Documents", "Admin documents list"),
  item("admin", "admin_reports", "Reports", "Admin reports"),
  item("admin", "admin_health_risks", "Health risks admin", "Admin health risks"),
  item("admin", "admin_jobs", "Jobs", "Background jobs UI"),
  item("admin", "admin_errors", "Error logs", "Error log viewer"),
  item("admin", "admin_health", "System health", "Live health panel"),
  item("admin", "admin_tickets", "Support tickets", "Tickets admin"),

  // Security
  item("security", "iso_report", "Report isolation", "User A ≠ User B report"),
  item("security", "iso_document", "Document isolation", "User A ≠ User B document"),
  item("security", "iso_family", "Family isolation", "User A ≠ User B family"),
  item("security", "share_expire", "Share links expire", "Expired token blocked"),
  item("security", "share_revoke", "Share revoke", "Revoked link blocked"),
  item("security", "no_storage_path", "No storage paths", "API never returns file paths"),
  item("security", "no_medical_logs", "No medical text in logs", "Error logs sanitized"),
  item("security", "no_secrets_logs", "No secrets in logs", "No passwords/tokens logged"),
  item("security", "export_scoped", "Export user-scoped", "Export only own data"),
  item("security", "delete_account", "Delete account safe", "Deletion request flow"),

  // PWA
  item("pwa", "pwa_mobile_layout", "Mobile layout", "Bottom nav and spacing OK"),
  item("pwa", "pwa_hamburger", "Hamburger menu", "Mobile menu opens"),
  item("pwa", "pwa_manifest", "Manifest valid", "/manifest.webmanifest JSON valid"),
  item("pwa", "pwa_icons", "PWA icons", "192/512 icons present"),
  item("pwa", "pwa_favicon", "Favicon", "Tab favicon shows logo"),
  item("pwa", "pwa_installable", "Installable", "Add to home screen works"),
  item("pwa", "pwa_push", "Push setup", "Push configured or clear message"),

  // Production
  item("production", "prod_build", "npm run build", "Production build passes"),
  item("production", "prod_prisma", "Prisma client", "prisma generate OK"),
  item("production", "prod_migrate", "Migrations applied", "DB schema current"),
  item("production", "prod_env", "Env validation", "Required env present"),
  item("production", "prod_robots", "/robots.txt", "Robots route works"),
  item("production", "prod_sitemap", "/sitemap.xml", "Sitemap route works"),
  item("production", "prod_404", "404 page", "Unknown routes show 404"),
  item("production", "prod_error_page", "Error page", "Error boundary/page works"),
  item("production", "prod_smoke", "Smoke test script", "npm run test:smoke passes"),
  item("production", "prod_check", "Production check", "npm run prod:check passes"),
];
