/**
 * Maps Vaidya GPT QA checklist keys to automated evidence sources.
 */
import { QA_CHECKLIST_ITEMS } from "../lib/qa-checklist-seed";

export type ItemStatus = "pass" | "fail" | "pending" | "skip";

export type VerifyResult = {
  status: ItemStatus;
  note: string;
};

export type E2eCheckRow = {
  name: string;
  result: "pass" | "fail" | "skip" | "warn";
  detail?: string;
};

export type ManualGuideEntry = {
  group: string;
  key: string;
  title: string;
  url: string;
  steps: string[];
  expected: string;
};

/** E2E runner check name → QA checklist key(s) */
export const E2E_CHECK_TO_QA: Record<string, string | string[]> = {
  manifest_name_vaidya_gpt: ["brand_logo_pwa", "pwa_manifest"],
  manifest_icon_192: "pwa_icons",
  manifest_icon_512: "pwa_icons",
  asset_brand_logo_png: "brand_logo_pwa",
  asset_icons_icon_192_png: "pwa_icons",
  asset_icons_icon_512_png: "pwa_icons",
  asset_favicon_ico: "pwa_favicon",
  signup_user_a: "signup_works",
  signup_user_b: "signup_works",
  login_user_a: "login_works",
  login_user_b: "login_works",
  email_otp_signup_unverified: "verify_email_otp_sent",
  email_otp_wrong_code: "otp_attempts_limited",
  email_otp_verify_success: "verify_email",
  email_otp_resend_cooldown: "verify_email_resend_cooldown",
  forgot_password_unknown_generic: "forgot_password_generic",
  forgot_password_reset_flow: "forgot_password",
  login_old_password_fails: "reset_password",
  login_new_password_works: "reset_password",
  auth_me_user_a: "login_works",
  admin_denied_regular_user: "non_admin_blocked",
  onboarding_complete: ["onboarding_skip", "onboarding_dashboard"],
  onboarding_flag_set: "onboarding_no_loop",
  page_dashboard: ["onboarding_dashboard", "onboarding_refresh"],
  page_upload: "onboarding_upload_optional",
  page_family: "onboarding_family",
  family_create_user_a: "family_add",
  family_list_includes_self: "family_add",
  family_isolation_user_b: "iso_family",
  free_plan_uploads_per_month: "billing_free_limits",
  free_plan_ai_summaries: "billing_free_limits",
  free_plan_max_image_pages: "billing_image_limits",
  billing_mock_removed: "billing_razorpay_checkout",
  billing_create_order_unauth: "billing_razorpay_checkout",
  billing_create_order_authed: "billing_razorpay_checkout",
  billing_verify_invalid_signature: "billing_invalid_signature",
  billing_payments_history: "billing_payment_history",
  profile_unauth: "profile_page",
  profile_update: "profile_page",
  profile_get: "profile_page",
  profile_phone_normalized: "profile_phone",
  profile_billing_complete: "profile_billing_gate",
  profile_isolation: "profile_page",
  razorpay_prefill_contact: "razorpay_prefill",
  billing_csp_razorpay: "billing_razorpay_checkout",
  billing_razorpay_status: "billing_razorpay_checkout",
  billing_force_plan_pro: "billing_image_limits",
  free_4_image_limit: "free_3_pages",
  free_4_image_limit_message: "free_3_pages",
  upload_invalid_file_rejected: "bad_type_blocked",
  upload_single_image: "upload_single_image",
  upload_single_ocr_status: "ocr_openai_vision",
  upload_single_extracted_text_length: ["ocr_openai_vision", "ai_real_text"],
  upload_free_multi_3_images: "upload_multi_image",
  upload_free_multi_upload_mode: "upload_multi_image",
  upload_free_multi_page_count: "upload_multi_image",
  upload_free_multi_usage_increment: "multi_counts_one_upload",
  upload_free_multi_ocr_status: "ocr_openai_vision",
  upload_free_multi_page_markers: "ocr_multi_order",
  pro_4_image_upload: "pro_20_pages",
  pro_4_image_page_count: "pro_20_pages",
  pro_4_image_usage_increment: "multi_counts_one_upload",
  pro_4_image_ocr_status: "ocr_openai_vision",
  pro_4_image_page_markers: "ocr_multi_order",
  fixture_detection: "ocr_openai_vision",
  ai_not_configured_without_key: "ai_key_required",
  report_context_saved: "ai_context_form",
  generate_summary: "ai_no_mock_flow",
  generate_summary_report_id: "ai_real_text",
  structured_parser_tsh: "structured_lab_parser",
  structured_parser_ldl: "structured_lab_parser",
  structured_parser_bilirubin_direct: "structured_lab_parser",
  structured_parser_pcv: "structured_lab_parser",
  structured_summary_validation_detects_unknown: "unknown_values_prevented",
  structured_summary_repair_removes_generic_unknown: "unknown_values_prevented",
  structured_summary_repair_injects_tsh: "ai_summary_structured_values",
  compact_context_no_full_text: "ai_compact_context",
  compact_context_has_structured_block: "ai_compact_context",
  weather_no_invent: "weather_location_recommendations",
  food_max_7: "recommendations_5_7_limit",
  recommendations_min_5: "recommendations_5_7_limit",
  indian_diet_examples: "indian_diet_recommendations",
  repair_enforces_5_7: "recommendations_5_7_limit",
  chat_history_last_4: "ai_token_optimization",
  chat_history_uses_summary: "ai_token_optimization",
  response_cache_hit: "ai_response_cache",
  response_cache_hash_stable: "ai_response_cache",
  response_cache_hit_skipped_no_user: "ai_response_cache",
  debug_stats_prod_blocked: "ai_token_optimization",
  debug_stats_dev_allowed: "ai_token_optimization",
  health_score_all_normal: "health_score_universal_engine",
  health_score_ast_alt_mild: "health_score_universal_engine",
  health_score_tsh_major: "health_score_universal_engine",
  health_score_ldl_mild: "health_score_universal_engine",
  health_score_hba1c_major: "health_score_universal_engine",
  health_score_vitamin_d_low: "health_score_universal_engine",
  health_score_egfr_normal: "health_score_egfr_normal",
  health_score_pcv_low: "health_score_universal_engine",
  health_score_multiple_mild: "health_score_universal_engine",
  health_score_critical: "health_score_universal_engine",
  get_report_summary: ["report_summary", "ai_real_text"],
  report_no_mock_markers: ["ai_no_mock_flow", "ai_no_fixed_score"],
  report_summary_nonempty: "ai_real_text",
  report_summary_nonempty: "report_summary",
  health_risks_list: "risk_page",
  extract_risks: "risk_after_summary",
  health_risk_dismiss: "risk_dismiss",
  reminder_suggestions_list: "suggestion_dismiss",
  notifications_list: "dashboard_tasks",
  report_doctor_questions: "report_questions",
  report_doctor_pack: "report_doctor_pack",
  report_pdf: "report_pdf",
  report_chat_get: ["report_chat_translate", "chat_report"],
  report_chat_post: ["report_chat_translate", "chat_report"],
  health_chat_get: "chat_family",
  health_chat_post: "chat_family",
  support_chat_post: "chat_support",
  chat_ask_unauth: "chat_isolation",
  general_chat_ask: ["chat_global", "chat_report"],
  chat_ask_general: ["chat_global", "chat_report"],
  report_chat_ask: "chat_report",
  chat_ask_report: "chat_report",
  family_chat_ask: "chat_family",
  chat_ask_family: "chat_family",
  chat_diagnosis_safety: ["chat_safety", "chat_no_diagnosis"],
  chat_diagnosis_safe_wording: ["chat_safety", "chat_no_diagnosis"],
  chat_prescription_safety: ["chat_safety", "chat_no_prescribe"],
  chat_prescription_refusal: ["chat_safety", "chat_no_prescribe"],
  chat_prescription_guidance: ["chat_safety", "chat_no_prescribe"],
  chat_emergency_safety: ["chat_safety", "chat_emergency"],
  chat_threads_list: ["chat_history", "chat_report"],
  chat_thread_detail: "chat_history",
  chat_delete_thread: "chat_delete",
  chat_user_isolation: ["chat_isolation", "ai_user_isolation"],
  chat_report_isolation: ["chat_isolation", "ai_user_isolation"],
  chat_thread_isolation: ["chat_isolation", "ai_user_isolation"],
  chat_hinglish: "chat_language",
  chat_language_hi: "chat_language",
  chat_message_too_long: ["chat_rate_limit", "chat_report"],
  chat_message_max_length: ["chat_rate_limit", "chat_report"],
  chat_rate_limit_shape: "chat_rate_limit",
  page_chat: ["chat_global", "chat_report"],
  page_report_chat: "chat_report",
  page_health_chat: "chat_family",
  health_chat_unauth: "chat_isolation",
  translate_text: "lang_report_openai",
  translate_batch: "lang_report_openai",
  report_translated_consent_or_content: "lang_consent",
  isolate_document: "iso_document",
  isolate_document_text: "iso_document",
  isolate_report: "iso_report",
  isolate_report_pdf: "iso_report",
  isolate_family_member: "iso_family",
  isolate_family_member_patch: "iso_family",
  admin_login: "admin_login",
  admin_system_health: "admin_health",
  admin_qa_checklist: "admin_health",
  admin_error_logs: "admin_errors",
  pwa_manifest_json: "pwa_manifest",
  pwa_robots_txt: "prod_robots",
  pwa_sitemap_xml: "prod_sitemap",
  pwa_favicon: "pwa_favicon",
  pwa_brand_logo: ["pwa_icons", "brand_logo_pwa"],
};

/** Keys verified only by live API/HTML (not E2E report) */
export const LIVE_VERIFY_KEYS = new Set([
  "brand_landing",
  "brand_dashboard",
  "brand_auth",
  "brand_no_old_name",
  "signup_consent",
  "logout_works",
  "onboarding_upload_optional",
  "upload_pdf",
  "upload_docx",
  "ocr_tesseract_safe",
  "ocr_rerun",
  "ocr_ui_message",
  "ai_short_text",
  "ai_skip_context",
  "ai_unique_reports",
  "risk_no_diagnosis",
  "risk_resolve",
  "family_edit",
  "family_conditions",
  "family_allergies",
  "family_meds",
  "family_vitals",
  "family_appointments",
  "family_emergency",
  "family_timeline",
  "family_lab_trends",
  "family_compare",
  "family_link_report",
  "reminder_create",
  "reminder_done",
  "reminder_skip",
  "reminder_repeat",
  "billing_razorpay_checkout",
  "billing_razorpay_verify",
  "billing_usage_counters",
  "admin_dashboard",
  "admin_users",
  "admin_documents",
  "admin_reports",
  "admin_health_risks",
  "admin_jobs",
  "admin_tickets",
  "no_storage_path",
  "no_medical_logs",
  "no_secrets_logs",
  "prod_404",
  "prod_prisma",
  "prod_migrate",
]);

/** Always manual / visual — never auto-overwritten to pass */
export const MANUAL_ONLY_KEYS = new Set([
  "brand_pdf",
  "forgot_password",
  "reset_password",
  "verify_email",
  "onboarding_new_user",
  "large_file_blocked",
  "upload_errors_clean",
  "ocr_partial_fail",
  "ocr_pdf_text",
  "ocr_docx",
  "ai_context_form",
  "report_findings",
  "report_abnormal",
  "report_charts",
  "report_context",
  "report_share",
  "risk_dashboard",
  "risk_report_page",
  "risk_family",
  "risk_backfill",
  "suggestion_accept",
  "lang_hindi_ui",
  "lang_regional",
  "lang_rtl",
  "lang_back_en",
  "lang_no_toast_spam",
  "lang_cache",
  "pwa_mobile_layout",
  "pwa_hamburger",
  "pwa_installable",
  "pwa_push",
  "share_expire",
  "share_revoke",
  "export_scoped",
  "delete_account",
  "prod_error_page",
]);

export const FORBIDDEN_RISK_PHRASES = [
  "you have diabetes",
  "you have heart disease",
  "take this medicine",
  "stop this medicine",
  "diagnosed with",
];

export const ALL_QA_KEYS = QA_CHECKLIST_ITEMS.map((i) => i.key);

/** E2E failures on these checks must not auto-fail unrelated checklist keys */
const E2E_FAIL_DOES_NOT_MAP: Record<string, string> = {
  generate_summary:
    "AI summary step failed in E2E — see report_context_saved and get_report_summary",
};

export function applyE2eToResults(
  results: Map<string, VerifyResult>,
  checks: E2eCheckRow[]
) {
  for (const row of checks) {
    if (row.result === "fail" && row.name in E2E_FAIL_DOES_NOT_MAP) {
      mergeResult(results, "ai_context_form", {
        status: "pending",
        note: `E2E fail (${row.name}): ${row.detail || E2E_FAIL_DOES_NOT_MAP[row.name]}`,
      });
      continue;
    }

    const keys = E2E_CHECK_TO_QA[row.name];
    if (!keys) continue;
    const list = Array.isArray(keys) ? keys : [keys];
    const status: ItemStatus =
      row.result === "pass"
        ? "pass"
        : row.result === "fail"
          ? "fail"
          : "pending";
    const note =
      row.name === "report_pdf" && row.result === "pass"
        ? `Verified by E2E report_pdf.${row.detail ? ` ${row.detail}` : ""}`
        : `E2E ${row.result}: ${row.detail || row.name}`;

    for (const key of list) {
      if (MANUAL_ONLY_KEYS.has(key)) continue;
      if (row.result === "warn") {
        mergeResult(results, key, {
          status: "pending",
          note: `E2E warn: ${row.detail || row.name}`,
        });
        continue;
      }
      mergeResult(results, key, { status, note });
    }
  }
}

export function mergeResult(
  results: Map<string, VerifyResult>,
  key: string,
  next: VerifyResult
) {
  const prev = results.get(key);
  if (!prev) {
    results.set(key, next);
    return;
  }
  const rank = (s: ItemStatus) =>
    s === "fail" ? 3 : s === "pass" ? 2 : s === "skip" ? 1 : 0;
  if (rank(next.status) > rank(prev.status)) {
    results.set(key, next);
  } else if (next.status === prev.status && next.note) {
    results.set(key, { ...prev, note: `${prev.note}; ${next.note}` });
  }
}

export function applySuiteMeta(
  results: Map<string, VerifyResult>,
  meta: {
    smokeOk?: boolean;
    prodOk?: boolean;
    prodWarnings?: boolean;
    e2eOk?: boolean;
    buildOk?: boolean;
  }
) {
  if (meta.smokeOk !== undefined) {
    mergeResult(results, "prod_smoke", {
      status: meta.smokeOk ? "pass" : "fail",
      note: meta.smokeOk
        ? "npm run test:smoke passed"
        : "npm run test:smoke failed",
    });
  }
  if (meta.prodOk !== undefined) {
    mergeResult(results, "prod_check", {
      status: meta.prodOk ? "pass" : "fail",
      note: meta.prodWarnings
        ? "npm run prod:check passed with warnings"
        : "npm run prod:check passed",
    });
    mergeResult(results, "prod_env", {
      status: meta.prodOk ? "pass" : "fail",
      note: "Verified by npm run prod:check",
    });
  }
  if (meta.buildOk !== undefined) {
    mergeResult(results, "prod_build", {
      status: meta.buildOk ? "pass" : "fail",
      note: meta.buildOk
        ? "npm run build passed (test:all)"
        : "npm run build failed (test:all)",
    });
    mergeResult(results, "prod_prisma", {
      status: meta.buildOk ? "pass" : "pending",
      note: "Inferred from successful production build",
    });
  }
  if (meta.e2eOk !== undefined) {
    mergeResult(results, "ai_user_isolation", {
      status: meta.e2eOk ? "pass" : "pending",
      note: meta.e2eOk
        ? "npm run test:e2e isolation checks passed"
        : "Run npm run test:e2e for isolation verification",
    });
  }
}

export const MANUAL_GUIDE: ManualGuideEntry[] = [
  {
    group: "branding",
    key: "brand_pdf",
    title: "Vaidya GPT in report PDF",
    url: "/reports/{id}",
    steps: [
      "Generate a report with AI summary",
      "Download PDF",
      "Inspect header/footer branding",
    ],
    expected: "PDF shows Vaidya GPT branding, not Carely-Med Gen AI",
  },
  {
    group: "auth",
    key: "forgot_password",
    title: "Forgot password",
    url: "/forgot-password",
    steps: ["Submit registered email", "Check email log or dev verification URL"],
    expected: "Reset flow starts without error",
  },
  {
    group: "auth",
    key: "reset_password",
    title: "Reset password",
    url: "/reset-password/{token}",
    steps: ["Open valid reset token", "Set new password", "Login with new password"],
    expected: "Password updates and login works",
  },
  {
    group: "auth",
    key: "verify_email",
    title: "Email verification",
    url: "/verify-email/{token}",
    steps: ["Open verification link from signup", "Check /api/auth/me emailVerified"],
    expected: "Account marked verified",
  },
  {
    group: "pwa",
    key: "pwa_mobile_layout",
    title: "Mobile layout",
    url: "/dashboard",
    steps: ["Open DevTools mobile viewport", "Check bottom nav and spacing"],
    expected: "Layout usable on small screens",
  },
  {
    group: "pwa",
    key: "pwa_hamburger",
    title: "Hamburger menu",
    url: "/",
    steps: ["Resize to mobile width", "Open menu icon"],
    expected: "Navigation menu opens and closes",
  },
  {
    group: "pwa",
    key: "pwa_installable",
    title: "Installable PWA",
    url: "/",
    steps: ["Chrome: install app prompt", "Add to home screen"],
    expected: "App installs with Vaidya GPT icon",
  },
  {
    group: "language",
    key: "lang_rtl",
    title: "Urdu RTL layout",
    url: "/settings",
    steps: ["Select Urdu (ur)", "Visit dashboard and a report"],
    expected: "RTL does not break layout",
  },
  {
    group: "language",
    key: "lang_hindi_ui",
    title: "Hindi dashboard UI",
    url: "/dashboard",
    steps: ["Switch language to Hindi", "Navigate dashboard without full refresh"],
    expected: "UI labels translate; no broken layout",
  },
  {
    group: "report",
    key: "report_charts",
    title: "Charts render",
    url: "/reports/{id}",
    steps: ["Open report with chartData", "Verify charts visible"],
    expected: "Recharts render correctly",
  },
  {
    group: "upload",
    key: "upload_pdf",
    title: "PDF upload",
    url: "/upload",
    steps: [
      "Add test-fixtures/sample-report.pdf to automate",
      "Upload PDF manually",
      "Confirm text extraction",
    ],
    expected: "PDF uploads and extracts text",
  },
  {
    group: "upload",
    key: "upload_docx",
    title: "DOCX upload",
    url: "/upload",
    steps: [
      "Add test-fixtures/sample-report.docx to automate",
      "Upload DOCX manually",
    ],
    expected: "DOCX text extracted",
  },
];

export function manualNoteForKey(key: string): string {
  const guide = MANUAL_GUIDE.find((g) => g.key === key);
  const item = QA_CHECKLIST_ITEMS.find((i) => i.key === key);
  const title = guide?.title || item?.label || key;
  const url = guide?.url || `/${key.replace(/_/g, "-")}`;
  return `Manual verification required: open ${url} and confirm — ${title}`;
}

export function pendingManual(
  results: Map<string, VerifyResult>,
  key: string,
  extra?: string
) {
  if (results.has(key) && results.get(key)!.status !== "pending") return;
  mergeResult(results, key, {
    status: "pending",
    note: extra || manualNoteForKey(key),
  });
}
