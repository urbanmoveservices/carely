import { getAuthHeaders } from "./auth-client";
import { normalizeFamilyPayload } from "./family-schemas";
import type {
  FamilyMember,
  FamilyMemberDetail,
  FamilyMemberInput,
  HealthCondition,
  Allergy,
  Medication,
  VitalRecord,
  Appointment,
  EmergencyContact,
  FamilyTimelineItem,
  FamilyDocument,
  Reminder,
  ReminderInput,
  RemindersListResponse,
  HealthTodayResponse,
  SearchResponse,
  InsightsResponse,
  HealthInsight,
  VitalTrendResponse,
  ReportComparisonResponse,
  DoctorShareLink,
  DoctorQuestionSet,
  MedicationDoseLog,
  LabTestReference,
  SymptomJournalEntry,
  SharingOverview,
  CaregiverSharedOwner,
  EmergencyHealthCard,
  UserPreference,
  HealthRiskCard,
  HealthRisksResponse,
  PostProcessingSummary,
  AppNotificationItem,
  ReminderSuggestionItem,
  PublicSharedReport,
  UsageSummary,
  BillingPlan,
  PaymentHistoryItem,
  OnboardingStatus,
  DemoLoginResponse,
  GenerateSummaryResponse,
  GenerateSummaryWithContextRequest,
  GenerateSummaryWithContextResponse,
  ReportContext,
  ReportContextInput,
  ReportContextResponse,
  ChatAskInput,
  ChatAskResponse,
  ChatThreadListItem,
} from "@/types";

const BASE = "";

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    const err = new Error(
      data.error || data.message || "Request failed"
    ) as Error & { code?: string; retryAfterSeconds?: number };
    if (data.code) err.code = data.code;
    if (typeof data.retryAfterSeconds === "number") {
      err.retryAfterSeconds = data.retryAfterSeconds;
    }
    throw err;
  }

  return data as T;
}

async function downloadBlob(url: string, filename: string): Promise<void> {
  const res = await fetch(url, {
    headers: { ...getAuthHeaders() },
  });

  if (!res.ok) {
    let msg = "Download failed";
    try {
      const data = await res.json();
      msg = data.error || data.message || msg;
    } catch {}
    throw new Error(msg);
  }

  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body: unknown) =>
    request<T>(url, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(url: string, body: unknown) =>
    request<T>(url, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
  downloadReportPdf: (reportId: string, language?: string) => {
    const q = language && language !== "en" ? `?language=${encodeURIComponent(language)}` : "";
    return downloadBlob(
      `/api/reports/${reportId}/pdf${q}`,
      `vaidya-gpt-report-${reportId}.pdf`
    );
  },

  getTranslatedReport: (
    reportId: string,
    language: string
  ) =>
    request<{
      reportId: string;
      language: string;
      sourceLanguage: string;
      translated: boolean;
      fromCache?: boolean;
      partial?: boolean;
      warning?: string;
      content: {
        summary: string;
        keyFindings: import("@/types").KeyFinding[];
        abnormalValues: import("@/types").AbnormalValue[];
        foodRecommendations: string[];
        exerciseRecommendations: string[];
        lifestyleAdvice: string[];
        riskFlags: import("@/types").RiskFlag[];
        chartData: import("@/types").ChartDataPoint[];
      };
    }>(`/api/reports/${reportId}/translated?language=${encodeURIComponent(language)}`),

  getFamilyMembers: () => request<FamilyMember[]>("/api/family-members"),
  createFamilyMember: (body: FamilyMemberInput) =>
    request<FamilyMember>("/api/family-members", {
      method: "POST",
      body: JSON.stringify(normalizeFamilyPayload(body)),
    }),
  getFamilyMember: (id: string) =>
    request<FamilyMemberDetail>(`/api/family-members/${id}`),
  updateFamilyMember: (id: string, body: Partial<FamilyMemberInput>) =>
    request<FamilyMember>(`/api/family-members/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteFamilyMember: (id: string) =>
    request<{ success: boolean }>(`/api/family-members/${id}`, {
      method: "DELETE",
    }),
  getFamilyMemberDocuments: (id: string) =>
    request<FamilyDocument[]>(`/api/family-members/${id}/documents`),
  getFamilyMemberTimeline: (id: string) =>
    request<FamilyTimelineItem[]>(`/api/family-members/${id}/timeline`),

  getConditions: (memberId: string) =>
    request<HealthCondition[]>(`/api/family-members/${memberId}/conditions`),
  createCondition: (memberId: string, body: object) =>
    request<HealthCondition>(`/api/family-members/${memberId}/conditions`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateCondition: (
    memberId: string,
    conditionId: string,
    body: object
  ) =>
    request<HealthCondition>(
      `/api/family-members/${memberId}/conditions/${conditionId}`,
      { method: "PATCH", body: JSON.stringify(body) }
    ),
  deleteCondition: (memberId: string, conditionId: string) =>
    request<{ success: boolean }>(
      `/api/family-members/${memberId}/conditions/${conditionId}`,
      { method: "DELETE" }
    ),

  getAllergies: (memberId: string) =>
    request<Allergy[]>(`/api/family-members/${memberId}/allergies`),
  createAllergy: (memberId: string, body: object) =>
    request<Allergy>(`/api/family-members/${memberId}/allergies`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateAllergy: (memberId: string, allergyId: string, body: object) =>
    request<Allergy>(`/api/family-members/${memberId}/allergies/${allergyId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteAllergy: (memberId: string, allergyId: string) =>
    request<{ success: boolean }>(
      `/api/family-members/${memberId}/allergies/${allergyId}`,
      { method: "DELETE" }
    ),

  getMedications: (memberId: string) =>
    request<Medication[]>(`/api/family-members/${memberId}/medications`),
  createMedication: (memberId: string, body: object) =>
    request<Medication>(`/api/family-members/${memberId}/medications`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateMedication: (
    memberId: string,
    medicationId: string,
    body: object
  ) =>
    request<Medication>(
      `/api/family-members/${memberId}/medications/${medicationId}`,
      { method: "PATCH", body: JSON.stringify(body) }
    ),
  deleteMedication: (memberId: string, medicationId: string) =>
    request<{ success: boolean }>(
      `/api/family-members/${memberId}/medications/${medicationId}`,
      { method: "DELETE" }
    ),

  getVitals: (memberId: string) =>
    request<VitalRecord[]>(`/api/family-members/${memberId}/vitals`),
  createVital: (memberId: string, body: object) =>
    request<VitalRecord>(`/api/family-members/${memberId}/vitals`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateVital: (memberId: string, vitalId: string, body: object) =>
    request<VitalRecord>(`/api/family-members/${memberId}/vitals/${vitalId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteVital: (memberId: string, vitalId: string) =>
    request<{ success: boolean }>(
      `/api/family-members/${memberId}/vitals/${vitalId}`,
      { method: "DELETE" }
    ),

  getAppointments: (memberId: string) =>
    request<Appointment[]>(`/api/family-members/${memberId}/appointments`),
  createAppointment: (memberId: string, body: object) =>
    request<Appointment>(`/api/family-members/${memberId}/appointments`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateAppointment: (
    memberId: string,
    appointmentId: string,
    body: object
  ) =>
    request<Appointment>(
      `/api/family-members/${memberId}/appointments/${appointmentId}`,
      { method: "PATCH", body: JSON.stringify(body) }
    ),
  deleteAppointment: (memberId: string, appointmentId: string) =>
    request<{ success: boolean }>(
      `/api/family-members/${memberId}/appointments/${appointmentId}`,
      { method: "DELETE" }
    ),

  getEmergencyContacts: (memberId: string) =>
    request<EmergencyContact[]>(
      `/api/family-members/${memberId}/emergency-contacts`
    ),
  createEmergencyContact: (memberId: string, body: object) =>
    request<EmergencyContact>(
      `/api/family-members/${memberId}/emergency-contacts`,
      { method: "POST", body: JSON.stringify(body) }
    ),
  updateEmergencyContact: (
    memberId: string,
    contactId: string,
    body: object
  ) =>
    request<EmergencyContact>(
      `/api/family-members/${memberId}/emergency-contacts/${contactId}`,
      { method: "PATCH", body: JSON.stringify(body) }
    ),
  deleteEmergencyContact: (memberId: string, contactId: string) =>
    request<{ success: boolean }>(
      `/api/family-members/${memberId}/emergency-contacts/${contactId}`,
      { method: "DELETE" }
    ),

  getReminders: (query?: string) =>
    request<RemindersListResponse>(`/api/reminders${query ? `?${query}` : ""}`),
  createReminder: (body: ReminderInput) =>
    request<Reminder>("/api/reminders", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getReminder: (id: string) => request<Reminder>(`/api/reminders/${id}`),
  updateReminder: (id: string, body: Partial<ReminderInput>) =>
    request<Reminder>(`/api/reminders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteReminder: (id: string) =>
    request<{ success: boolean }>(`/api/reminders/${id}`, { method: "DELETE" }),
  updateReminderStatus: (id: string, status: "done" | "skipped" | "cancelled") =>
    request<Reminder>(`/api/reminders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  getHealthToday: () => request<HealthTodayResponse>("/api/health-today"),

  searchAll: (query: string) =>
    request<SearchResponse>(`/api/search?${query}`),
  getInsights: (query?: string) =>
    request<InsightsResponse>(`/api/insights${query ? `?${query}` : ""}`),
  generateInsights: (body?: { familyMemberId?: string }) =>
    request<{ success: boolean; generated: number }>("/api/insights/generate", {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),
  markInsightRead: (id: string) =>
    request<{ success: boolean }>(`/api/insights/${id}/read`, { method: "PATCH" }),
  deleteInsight: (id: string) =>
    request<{ success: boolean }>(`/api/insights/${id}`, { method: "DELETE" }),
  getVitalTrends: (memberId: string, query?: string) =>
    request<VitalTrendResponse>(
      `/api/family-members/${memberId}/vitals/trends${query ? `?${query}` : ""}`
    ),
  getReportComparison: (memberId: string) =>
    request<ReportComparisonResponse>(
      `/api/family-members/${memberId}/report-comparison`
    ),

  createReportShareLink: (reportId: string, body: object) =>
    request<{ shareUrl: string; expiresAt: string; id: string }>(
      `/api/reports/${reportId}/share-link`,
      { method: "POST", body: JSON.stringify(body) }
    ),
  getReportShareLinks: (reportId: string) =>
    request<DoctorShareLink[]>(`/api/reports/${reportId}/share-link`),
  revokeShareLink: (shareLinkId: string) =>
    request<{ success: boolean }>(
      `/api/reports/share-links/${shareLinkId}/revoke`,
      { method: "PATCH", body: JSON.stringify({}) }
    ),
  getDoctorQuestions: async (reportId: string): Promise<DoctorQuestionSet> => {
    const res = await fetch(`/api/reports/${reportId}/doctor-questions`, {
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
    });
    const data = await res.json();
    if (res.status === 404) {
      const err = new Error(
        data.error || "Report not found or you do not have access."
      ) as Error & { status?: number };
      err.status = 404;
      throw err;
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error(data.error || "Unauthorized");
    }
    if (!res.ok) {
      throw new Error(data.error || data.message || "Request failed");
    }
    return data as DoctorQuestionSet;
  },
  generateDoctorQuestions: async (
    reportId: string,
    force?: boolean
  ): Promise<DoctorQuestionSet> => {
    const res = await fetch(
      `/api/reports/${reportId}/doctor-questions${force ? "?force=true" : ""}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({}),
      }
    );
    const data = await res.json();
    if (res.status === 404) {
      throw new Error(
        data.error || "Report not found or you do not have access."
      );
    }
    if (!res.ok) {
      throw new Error(
        data.error || data.message || "Could not generate doctor questions. Please try again."
      );
    }
    return data as DoctorQuestionSet;
  },
  getDoseLogs: (memberId: string, medicationId: string) =>
    request<MedicationDoseLog[]>(
      `/api/family-members/${memberId}/medications/${medicationId}/dose-logs`
    ),
  createDoseLog: (memberId: string, medicationId: string, body: object) =>
    request<MedicationDoseLog>(
      `/api/family-members/${memberId}/medications/${medicationId}/dose-logs`,
      { method: "POST", body: JSON.stringify(body) }
    ),
  updateDoseLog: (
    memberId: string,
    medicationId: string,
    doseLogId: string,
    body: object
  ) =>
    request<MedicationDoseLog>(
      `/api/family-members/${memberId}/medications/${medicationId}/dose-logs/${doseLogId}`,
      { method: "PATCH", body: JSON.stringify(body) }
    ),
  getHealthRisks: (query?: string) =>
    request<HealthRisksResponse>(`/api/health-risks${query ? `?${query}` : ""}`),
  updateHealthRiskStatus: (id: string, status: "active" | "resolved" | "dismissed") =>
    request<{ id: string; status: string }>(`/api/health-risks/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  extractRisksForReport: (reportId: string) =>
    request<{ report_id: string; postProcessing: PostProcessingSummary }>(
      `/api/reports/${reportId}/extract-risks`,
      { method: "POST", body: JSON.stringify({}) }
    ),
  getReminderSuggestions: (query?: string) =>
    request<{ items: ReminderSuggestionItem[]; total: number }>(
      `/api/reminder-suggestions${query ? `?${query}` : ""}`
    ),
  acceptReminderSuggestion: (id: string) =>
    request<{ suggestionId: string; reminder: { id: string; title: string; scheduledAt: string; status: string } }>(
      `/api/reminder-suggestions/${id}/accept`,
      { method: "POST", body: JSON.stringify({}) }
    ),
  dismissReminderSuggestion: (id: string) =>
    request<{ id: string; status: string }>(`/api/reminder-suggestions/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "dismissed" }),
    }),
  getNotifications: (query?: string) =>
    request<{ items: AppNotificationItem[]; unreadCount: number }>(
      `/api/notifications${query ? `?${query}` : ""}`
    ),
  markNotificationRead: (id: string) =>
    request<{ id: string; isRead: boolean }>(`/api/notifications/${id}/read`, {
      method: "PATCH",
      body: JSON.stringify({}),
    }),
  markAllNotificationsRead: () =>
    request<{ updated: number }>("/api/notifications/read-all", {
      method: "PATCH",
      body: JSON.stringify({}),
    }),
  getReportHealthRisks: (reportId: string) =>
    request<HealthRisksResponse>(
      `/api/health-risks?status=active&reportId=${encodeURIComponent(reportId)}&limit=50`
    ),
  getLabTests: (query?: string) =>
    request<{ items: LabTestReference[] }>(`/api/lab-tests${query ? `?${query}` : ""}`),
  getLabTest: (id: string) => request<LabTestReference>(`/api/lab-tests/${id}`),
  getSymptomJournal: (query?: string) =>
    request<{ items: SymptomJournalEntry[] }>(
      `/api/symptom-journal${query ? `?${query}` : ""}`
    ),
  createSymptomEntry: (body: object) =>
    request<SymptomJournalEntry>("/api/symptom-journal", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getSymptomEntry: (id: string) =>
    request<SymptomJournalEntry>(`/api/symptom-journal/${id}`),
  updateSymptomEntry: (id: string, body: object) =>
    request<SymptomJournalEntry>(`/api/symptom-journal/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteSymptomEntry: (id: string) =>
    request<{ success: boolean }>(`/api/symptom-journal/${id}`, { method: "DELETE" }),
  getSharingOverview: () => request<SharingOverview>("/api/caregiver-invites"),
  createCaregiverInvite: (body: object) =>
    request<{ id: string; inviteUrl: string; expiresAt: string }>("/api/caregiver-invites", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  revokeCaregiverInvite: (id: string) =>
    request<{ success: boolean }>(`/api/caregiver-invites/${id}/revoke`, {
      method: "PATCH",
      body: JSON.stringify({}),
    }),
  acceptCaregiverInvite: (token: string) =>
    request<{ success: boolean }>(`/api/caregiver-invites/accept/${token}`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  getCaregiverSharedWithMe: () =>
    request<{ owners: CaregiverSharedOwner[] }>("/api/caregiver/shared-with-me"),
  getEmergencyCard: (memberId: string) =>
    request<EmergencyHealthCard | null>(`/api/family-members/${memberId}/emergency-card`),
  upsertEmergencyCard: (memberId: string, body: object) =>
    request<EmergencyHealthCard>(`/api/family-members/${memberId}/emergency-card`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  downloadEmergencyCardPdf: (memberId: string) =>
    downloadBlob(
      `/api/family-members/${memberId}/emergency-card/pdf`,
      `carely-emergency-card-${memberId}.pdf`
    ),
  getPreferences: () => request<UserPreference>("/api/preferences"),
  updatePreferences: (body: Partial<UserPreference>) =>
    request<UserPreference>("/api/preferences", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  translateText: (body: {
    text: string;
    targetLanguage: string;
    sourceLanguage?: string;
    context?: "ui" | "medical_report" | "legal" | "general";
  }) =>
    request<{
      translatedText: string;
      targetLanguage: string;
      cached: boolean;
      warning?: string;
    }>("/api/translate/text", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  translateBatch: (body: {
    texts: string[];
    targetLanguage: string;
    sourceLanguage?: string;
    context?: "ui" | "medical_report" | "legal" | "general";
  }) =>
    request<{
      translations: string[];
      targetLanguage: string;
      cached: boolean[];
      warning?: string;
    }>("/api/translate/batch", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  translateObject: (body: {
    data: unknown;
    targetLanguage: string;
    sourceLanguage?: string;
    context?: "medical_report" | "general" | "legal";
  }) =>
    request<{ data: unknown; targetLanguage: string }>("/api/translate/object", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getTranslationStatus: () =>
    request<{
      provider: string;
      isCloud: boolean;
      openAiConfigured: boolean;
      translationModel: string;
      medicalConsentRequired: boolean;
      cacheCount: number;
      allowCloudTranslation: boolean;
      supportedLanguages: string[];
    }>("/api/translate/status"),
  getPublicSharedReport: (token: string) =>
    fetch(`/api/share/report/${token}`).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load report");
      return data as PublicSharedReport;
    }),
  getPublicEmergencyCard: (token: string) =>
    fetch(`/api/emergency-card/${token}`).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load card");
      return data;
    }),

  getProfile: () => request<import("@/types").UserProfile>("/api/profile"),
  updateProfile: (data: import("@/types").UpdateProfileInput) =>
    request<import("@/types").UserProfile>("/api/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  updateBillingProfile: (data: import("@/types").BillingProfileInput) =>
    request<import("@/types").UserProfile>("/api/profile/billing", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  getBillingPlans: () =>
    request<{
      plans: BillingPlan[];
      disclaimer: string;
      razorpayConfigured: boolean;
    }>("/api/billing/plans"),
  getBillingUsage: () => request<UsageSummary>("/api/billing/usage"),
  getBillingPayments: () =>
    request<{
      payments: PaymentHistoryItem[];
      warning?: string;
      code?: string;
    }>("/api/billing/payments"),
  getRazorpayStatus: () =>
    request<{
      enabled: boolean;
      configured: boolean;
      keyIdPresent: boolean;
      mode?: "test" | "live" | "unknown";
      keyPrefix?: string | null;
      currency: string;
      message?: string;
    }>("/api/billing/razorpay/status"),
  createRazorpayOrder: (plan: "pro" | "family") =>
    request<{
      keyId: string;
      orderId: string;
      amount: number;
      currency: string;
      plan: string;
      receipt: string;
      prefill?: { name: string; email: string; contact: string };
    }>("/api/billing/razorpay/create-order", {
      method: "POST",
      body: JSON.stringify({ plan }),
    }),
  verifyRazorpayPayment: (body: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) =>
    request<{
      success: boolean;
      verified: boolean;
      alreadyVerified: boolean;
      plan: string;
      planName: string;
      expiresAt: string | null;
      message: string;
    }>("/api/billing/razorpay/verify", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getOnboardingStatus: () =>
    request<OnboardingStatus>("/api/onboarding/status"),
  completeOnboarding: (skipped?: boolean) =>
    request<{
      success: boolean;
      onboardingCompleted: boolean;
      user?: import("@/types").User;
    }>("/api/onboarding/complete", {
      method: "POST",
      body: JSON.stringify(skipped ? { skipped: true } : {}),
    }),
  updateOnboardingProfile: (body: {
    name?: string;
    intent?: "self" | "family";
  }) =>
    request<{ success: boolean }>("/api/onboarding/profile", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  resetOnboarding: () =>
    request<{ success: boolean }>("/api/onboarding/reset", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  demoLogin: () =>
    fetch("/api/demo/login", { method: "POST" }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Demo login failed");
      return data as DemoLoginResponse;
    }),
  requestPasswordResetCode: (email: string) =>
    fetch("/api/auth/password/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data as { success: boolean; message: string };
    }),
  forgotPassword: (email: string) =>
    fetch("/api/auth/password/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data as { success: boolean; message: string };
    }),
  resetPasswordWithCode: (email: string, code: string, newPassword: string) =>
    fetch("/api/auth/password/reset-with-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, newPassword }),
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        const err = new Error(data.error || "Reset failed") as Error & {
          code?: string;
        };
        if (data.code) err.code = data.code;
        throw err;
      }
      return data as { success: boolean; message: string };
    }),
  resetPassword: (token: string, password: string) =>
    fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      return data;
    }),
  sendVerification: () => api.sendEmailVerificationCode(),
  sendEmailVerificationCode: () =>
    request<{
      success?: boolean;
      message: string;
      emailMasked?: string;
      code?: string;
    }>("/api/auth/email/send-code", { method: "POST", body: JSON.stringify({}) }),
  verifyEmailCode: (code: string) =>
    request<{ success: boolean; message: string }>(
      "/api/auth/email/verify-code",
      { method: "POST", body: JSON.stringify({ code }) }
    ),
  verifyEmail: (token: string) =>
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      return data;
    }),

  regenerateDocumentSummary: (documentId: string) =>
    request<GenerateSummaryResponse & { regenerated?: boolean }>(
      `/api/documents/${documentId}/regenerate-summary`,
      { method: "POST", body: JSON.stringify({}) }
    ),

  getReportContext: (documentId: string) =>
    request<ReportContextResponse>(`/api/documents/${documentId}/report-context`),

  saveReportContext: (documentId: string, data: ReportContextInput) =>
    request<{ context: ReportContext }>(
      `/api/documents/${documentId}/report-context`,
      { method: "POST", body: JSON.stringify(data) }
    ),

  generateSummaryWithContext: (
    documentId: string,
    body: GenerateSummaryWithContextRequest
  ) =>
    request<GenerateSummaryWithContextResponse>(
      `/api/documents/${documentId}/generate-summary`,
      { method: "POST", body: JSON.stringify(body) }
    ),

  chatAsk: (body: ChatAskInput) =>
    request<ChatAskResponse>("/api/chat/ask", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getChatThreads: (params?: {
    type?: string;
    reportId?: string;
    familyMemberId?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.type) q.set("type", params.type);
    if (params?.reportId) q.set("reportId", params.reportId);
    if (params?.familyMemberId) q.set("familyMemberId", params.familyMemberId);
    const qs = q.toString();
    return request<{ threads: ChatThreadListItem[] }>(
      `/api/chat/threads${qs ? `?${qs}` : ""}`
    );
  },

  getChatThread: (id: string) =>
    request<{
      thread: {
        id: string;
        messages: Array<{
          id: string;
          role: string;
          content: string;
          metadata?: Record<string, unknown> | null;
        }>;
      };
    }>(`/api/chat/threads/${id}`),

  deleteChatThread: (id: string) =>
    request<{ deleted: boolean }>(`/api/chat/threads/${id}`, { method: "DELETE" }),
};
