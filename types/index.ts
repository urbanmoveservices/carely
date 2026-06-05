export type PlanKey = "free" | "pro" | "family";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  createdAt: string;
  onboardingCompleted?: boolean;
  emailVerified?: boolean;
  emailVerifiedAt?: string | null;
  currentPlan?: string;
  subscriptionStatus?: string;
  isDemo?: boolean;
  billingProfileCompleted?: boolean;
  profileCompleted?: boolean;
}

export interface UserProfile {
  id: string;
  fullName: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  age: number | null;
  bloodGroup: string | null;
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
  maritalStatus: string | null;
  occupation: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
  emergencyContactName: string | null;
  emergencyContactRelation: string | null;
  emergencyContactPhone: string | null;
  preferredLanguage: string | null;
  knownConditionsSummary: string | null;
  allergiesSummary: string | null;
  currentMedicationsSummary: string | null;
  emailChangeNote?: string;
  profileCompleted: boolean;
  billingProfileCompleted: boolean;
  medicalProfileCompleted: boolean;
}

export type UpdateProfileInput = Partial<{
  fullName: string;
  phoneNumber: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  bloodGroup: string | null;
  heightCm: number | null;
  weightKg: number | null;
  maritalStatus: string | null;
  occupation: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
  emergencyContactName: string | null;
  emergencyContactRelation: string | null;
  emergencyContactPhone: string | null;
  preferredLanguage: string | null;
  knownConditionsSummary: string | null;
  allergiesSummary: string | null;
  currentMedicationsSummary: string | null;
}>;

export interface BillingProfileInput {
  fullName: string;
  phoneNumber: string;
}

export interface PlanLimits {
  name: string;
  priceMonthly: number;
  priceLabel: string;
  description: string;
  uploadsPerMonth: number;
  aiSummariesPerMonth: number;
  chatMessagesPerMonth?: number;
  caregiverSharing: boolean;
  familyMembersLimit: number;
}

export interface BillingPlan extends PlanLimits {
  key: PlanKey;
  amountPaise?: number;
  durationDays?: number | null;
  requiresPayment?: boolean;
}

export interface PaymentHistoryItem {
  id: string;
  plan: string;
  amountPaise: number;
  currency: string;
  status: string;
  method: string | null;
  verified: boolean;
  providerPaymentId: string;
  createdAt: string;
}

export interface UsageSummary {
  plan: PlanKey;
  periodKey: string;
  serverTime: string;
  limits: {
    uploads: number;
    aiSummaries: number;
    familyMembers: number;
  };
  used: {
    uploads: number;
    aiSummaries: number;
    familyMembers: number;
  };
  remaining: {
    uploads: number;
    aiSummaries: number;
    familyMembers: number;
  };
  planName: string;
  priceLabel: string;
  description: string;
  subscriptionStatus: string;
  planStartedAt?: string | null;
  planExpiresAt?: string | null;
  billingProvider?: string | null;
  razorpayConfigured?: boolean;
  maxImagePagesPerReport: number;
  caregiverSharing: boolean;
  chatMessagesUsed?: number;
  chatMessagesLimit?: number;
  storedPlan?: PlanKey;
  effectivePlan?: PlanKey;
  limitResetNote?: string;
  warning?: string;
  /** @deprecated use periodKey */
  monthKey?: string;
  /** @deprecated use used/limits */
  usage?: {
    uploadsUsed: number;
    uploadsLimit: number;
    aiSummariesUsed: number;
    aiSummariesLimit: number;
    chatMessagesUsed?: number;
    chatMessagesLimit?: number;
    familyMembersUsed: number;
    familyMembersLimit: number;
    maxImagePagesPerReport: number;
    caregiverSharing: boolean;
  };
}

export interface DocumentPageInfo {
  id: string;
  page_number: number;
  original_filename: string;
  mime_type: string;
  file_size: number;
  ocr_status: string;
  ocr_provider?: string | null;
  error_message: string | null;
  extracted_text_length: number;
}

export interface OnboardingStatus {
  completed: boolean;
  name: string;
  familyMemberCount: number;
  documentCount: number;
}

export interface DemoLoginResponse {
  access_token: string;
  token_type: "bearer";
  user: User;
}

export interface AuthResponse {
  access_token: string;
  token_type: "bearer";
  user: User;
}

export type UploadStatus =
  | "uploaded"
  | "processing"
  | "text_extracted"
  | "generating_summary"
  | "ai_completed"
  | "summary_failed"
  | "failed";

export interface FamilyMemberRef {
  id: string;
  fullName: string;
  relation: string;
}

export interface DocumentItem {
  id: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  upload_status: UploadStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  report_id: string | null;
  family_member: FamilyMemberRef | null;
}

export interface DocumentDetail {
  id: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  upload_mode?: string;
  page_count?: number;
  upload_status: UploadStatus;
  error_message: string | null;
  extracted_text_preview: string | null;
  extracted_text_length: number;
  created_at: string;
  updated_at: string;
  report_id: string | null;
  family_member: FamilyMemberRef | null;
  pages?: DocumentPageInfo[];
  failed_page_count?: number;
}

export interface DocumentText {
  id: string;
  original_filename: string;
  extracted_text: string;
  upload_status: UploadStatus;
}

export interface GenerateSummaryResponse {
  report_id: string;
  document_id: string;
  upload_status: string;
  summary: string;
  created_at: string;
}

export type SmokingStatus =
  | "never"
  | "former"
  | "occasional"
  | "daily"
  | "prefer_not_to_say";
export type AlcoholUse =
  | "never"
  | "occasional"
  | "weekly"
  | "daily"
  | "prefer_not_to_say";
export type PhysicalActivity =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "athlete";
export type SugarIntake = "low" | "moderate" | "high" | "very_high" | "unknown";
export type FoodPreference =
  | "vegetarian"
  | "non_vegetarian"
  | "vegan"
  | "eggetarian"
  | "mixed"
  | "other";
export type SleepQuality = "poor" | "average" | "good";
export type StressLevel = "low" | "moderate" | "high";
export type FastingStatus = "fasting" | "non_fasting" | "unknown";
export type PregnancyStatus =
  | "not_applicable"
  | "no"
  | "yes"
  | "unknown"
  | "prefer_not_to_say";

export interface ReportContextInput {
  smokingStatus?: SmokingStatus | null;
  tobaccoUse?: string | null;
  alcoholUse?: AlcoholUse | null;
  physicalActivity?: PhysicalActivity | null;
  sugarIntake?: SugarIntake | null;
  foodPreference?: FoodPreference | null;
  dietNotes?: string | null;
  knownConditions?: string[];
  allergies?: string[];
  currentMedicines?: string[];
  familyHistory?: string[];
  symptoms?: string[];
  sleepQuality?: SleepQuality | null;
  stressLevel?: StressLevel | null;
  waterIntake?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  fastingStatus?: FastingStatus | null;
  recentFeverOrInfection?: boolean | null;
  supplements?: string[];
  pregnancyStatus?: PregnancyStatus | null;
  doctorDiagnosis?: string | null;
  notes?: string | null;
  consentAcknowledged?: boolean;
  skipContext?: boolean;
}

export interface ReportContext {
  id: string;
  document_id: string;
  family_member_id: string | null;
  smoking_status: string | null;
  tobacco_use: string | null;
  alcohol_use: string | null;
  physical_activity: string | null;
  sugar_intake: string | null;
  food_preference: string | null;
  diet_notes: string | null;
  known_conditions: string[];
  allergies: string[];
  current_medicines: string[];
  family_history: string[];
  symptoms: string[];
  sleep_quality: string | null;
  stress_level: string | null;
  water_intake: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  fasting_status: string | null;
  recent_fever_or_infection: boolean | null;
  supplements: string[];
  pregnancy_status: string | null;
  doctor_diagnosis: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportContextSuggestedDefaults {
  height_cm: number | null;
  weight_kg: number | null;
  known_conditions: string[];
  allergies: string[];
  current_medicines: string[];
  family_member?: {
    id: string;
    full_name: string;
    relation: string;
  };
}

export interface ReportContextResponse {
  context: ReportContext | null;
  suggested_defaults: ReportContextSuggestedDefaults | null;
  document: {
    id: string;
    original_filename: string;
    upload_status: string;
    family_member: FamilyMemberRef | null;
  };
}

export interface GenerateSummaryWithContextRequest {
  context?: ReportContextInput;
  skipContext?: boolean;
  consentAcknowledged?: boolean;
}

export interface GenerateSummaryWithContextResponse extends GenerateSummaryResponse {
  regenerated?: boolean;
  postProcessing?: PostProcessingSummary;
}

export interface AppNotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface ReminderSuggestionItem {
  id: string;
  type: string;
  title: string;
  message: string;
  suggestedDate: string | null;
  status: string;
  reportId: string | null;
  documentId: string | null;
  familyMemberId: string | null;
  createdAt: string;
}

export interface ContextualInsight {
  title: string;
  message: string;
  relatedContext?: string[];
  level: "info" | "warning" | "critical";
}

export interface KeyFinding {
  title: string;
  value: string;
  status: "normal" | "low" | "high" | "critical" | "unknown";
  explanation: string;
}

export interface AbnormalValue {
  name: string;
  value: string;
  normalRange: string;
  severity: "low" | "moderate" | "high" | "critical" | "unknown";
  meaning: string;
}

export interface RiskFlag {
  level: "info" | "warning" | "critical";
  message: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  normalMin?: number;
  normalMax?: number;
  unit?: string;
}

export interface HealthScoreFactorView {
  canonicalName: string;
  displayName: string;
  category: string;
  group?: string;
  value: number | string;
  unit: string | null;
  referenceRange: string | null;
  status: string;
  severity: "mild" | "moderate" | "major" | "critical";
  deduction: number;
  deductionApplied?: number;
  reason: string;
  combined?: boolean;
}

export interface ReportDetail {
  id: string;
  documentId: string;
  summary: string;
  keyFindings: KeyFinding[];
  abnormalValues: AbnormalValue[];
  foodRecommendations: string[];
  exerciseRecommendations: string[];
  lifestyleAdvice: string[];
  riskFlags: RiskFlag[];
  chartData: ChartDataPoint[];
  contextualInsights?: ContextualInsight[];
  healthScore?: number;
  scoreFactors?: HealthScoreFactorView[];
  scoreSource?: string | null;
  usesStructuredValues?: boolean;
  summaryValidationStatus?: string | null;
  aiModelUsed: string | null;
  processingTimeMs: number | null;
  createdAt: string;
  document: {
    id: string;
    originalFilename: string;
    fileType: string;
    fileSize: number;
    uploadStatus: string;
    createdAt: string;
  };
  family_member: FamilyMemberRef | null;
}

export interface AdminStats {
  totalUsers: number;
  totalDocuments: number;
  totalReports: number;
  completedReports: number;
  textExtractedDocuments: number;
  processingDocuments: number;
  failedDocuments: number;
  totalReminders?: number;
  pendingReminders?: number;
  doneReminders?: number;
  totalFamilyMembers?: number;
  totalInsights?: number;
  reportsThisMonth?: number;
  activeHealthRisks?: number;
  criticalHealthRisks?: number;
  warningHealthRisks?: number;
  pendingReminderSuggestions?: number;
  totalNotifications?: number;
  totalChatThreads?: number;
  totalChatMessages?: number;
  failedChatCallsLast30Days?: number;
  recentUsers: AdminUserRow[];
  recentDocuments: AdminDocumentRow[];
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  documentCount: number;
  reportCount: number;
  currentPlan?: string;
  emailVerified?: boolean;
  onboardingCompleted?: boolean;
  uploadsUsed?: number;
  aiSummariesUsed?: number;
  language?: string;
}

export interface AdminBillingStats {
  usersByPlan: { free: number; pro: number; family: number };
  uploadsThisMonth: number;
  aiSummariesThisMonth: number;
  monthKey: string;
  nearLimitUsers: {
    id: string;
    email: string;
    name: string;
    plan: string;
    reason: string;
  }[];
}

export interface AdminDocumentRow {
  id: string;
  originalFilename: string;
  fileType: string;
  fileSize: number;
  uploadMode?: string;
  pageCount?: number;
  failedPageCount?: number;
  uploadStatus: string;
  errorMessage: string | null;
  extractedTextLength: number;
  createdAt: string;
  user: { id: string; name: string; email: string };
  reportId: string | null;
  familyMember: { id: string; fullName: string; relation: string } | null;
}

export interface AdminReportRow {
  id: string;
  summary: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
  document: { id: string; originalFilename: string };
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogResponse {
  items: AuditLogEntry[];
  page: number;
  limit: number;
  total: number;
}

export interface AdminUserDetail {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  language?: string;
  phoneNumber?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  age?: number | null;
  bloodGroup?: string | null;
  currentPlan?: string;
  billingProfileCompleted?: boolean;
  medicalProfileCompleted?: boolean;
  profileCompleted?: boolean;
  documents: {
    id: string;
    originalFilename: string;
    fileType: string;
    fileSize: number;
    uploadStatus: string;
    createdAt: string;
    reportId: string | null;
    familyMember: { id: string; fullName: string; relation: string } | null;
  }[];
  reports: {
    id: string;
    summary: string;
    createdAt: string;
    documentId: string;
  }[];
  familyMembers?: {
    id: string;
    fullName: string;
    relation: string;
    documentCount: number;
    conditionCount?: number;
    medicationCount?: number;
    appointmentCount?: number;
  }[];
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export type RelationType =
  | "self" | "father" | "mother" | "spouse" | "son" | "daughter"
  | "brother" | "sister" | "grandfather" | "grandmother"
  | "uncle" | "aunt" | "cousin" | "friend" | "other";

export type GenderType = "male" | "female" | "other" | "prefer_not_to_say";
export type BloodGroupType =
  | "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "unknown";

export interface FamilyMember {
  id: string;
  fullName: string;
  relation: string;
  dateOfBirth: string | null;
  gender: string | null;
  bloodGroup?: string | null;
  phone: string | null;
  email?: string | null;
  profilePhotoUrl?: string | null;
  notes: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  createdAt: string;
  updatedAt: string;
  documentCount: number;
  conditionCount?: number;
  allergyCount?: number;
  medicationCount?: number;
  vitalCount?: number;
  appointmentCount?: number;
  emergencyContactCount?: number;
  lastReportAt?: string | null;
  lastAiSummaryAt?: string | null;
  lastRiskLevel?: string | null;
  healthScoreLatest?: number | null;
  activeConditionCount?: number;
  activeMedicationCount?: number;
  nextAppointment?: {
    id: string;
    title: string;
    appointmentAt: string;
  } | null;
}

export interface FamilyMemberInput {
  fullName: string;
  relation: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  bloodGroup?: string | null;
  phone?: string | null;
  email?: string | null;
  profilePhotoUrl?: string | null;
  notes?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
}

export interface HealthCondition {
  id: string;
  name: string;
  status: string;
  diagnosedOn?: string | null;
  severity?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Allergy {
  id: string;
  name: string;
  reaction?: string | null;
  severity?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage?: string | null;
  frequency?: string | null;
  instructions?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  refillDate?: string | null;
  status: string;
  prescribedBy?: string | null;
  notes?: string | null;
  reminderEnabled?: boolean;
  reminderTimes?: string[] | null;
  missedDoseCount?: number;
  lastTakenAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationDoseLog {
  id: string;
  medicationId: string;
  familyMemberId: string;
  scheduledAt: string;
  status: string;
  takenAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VitalRecord {
  id: string;
  type: string;
  label: string;
  value?: number | null;
  valueText?: string | null;
  unit?: string | null;
  measuredAt: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  title: string;
  doctorName?: string | null;
  hospitalName?: string | null;
  appointmentAt: string;
  status: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relation?: string | null;
  phone: string;
  email?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyTimelineItem {
  id: string;
  type: string;
  title: string;
  subtitle?: string | null;
  status?: string | null;
  occurredAt: string;
  entityId?: string;
  reportId?: string | null;
}

export interface FamilyStats {
  totalMembers: number;
  linkedReports: number;
  upcomingAppointments: number;
  activeMedications: number;
}

export interface FamilyDocument {
  id: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  upload_status: string;
  error_message?: string | null;
  created_at: string;
  updated_at?: string;
  report_id: string | null;
}

export type ReminderType = "medication" | "appointment" | "vital" | "custom";
export type ReminderStatus = "pending" | "done" | "skipped" | "cancelled";
export type ReminderRepeatType = "none" | "daily" | "weekly" | "monthly";

export interface ReminderFamilyRef {
  id: string;
  fullName: string;
  relation: string;
}

export interface Reminder {
  id: string;
  familyMemberId: string | null;
  familyMember: ReminderFamilyRef | null;
  type: ReminderType;
  title: string;
  description: string | null;
  scheduledAt: string;
  repeatType: ReminderRepeatType;
  status: ReminderStatus;
  relatedMedicationId: string | null;
  relatedAppointmentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderInput {
  familyMemberId?: string | null;
  type: ReminderType;
  title: string;
  description?: string | null;
  scheduledAt: string;
  repeatType?: ReminderRepeatType;
  relatedMedicationId?: string | null;
  relatedAppointmentId?: string | null;
}

export interface RemindersListResponse {
  items: Reminder[];
  total: number;
  page?: number;
  limit?: number;
}

export interface HealthTodayResponse {
  todayReminders: Reminder[];
  upcomingAppointments: {
    id: string;
    title: string;
    appointmentAt: string;
    doctorName?: string | null;
    hospitalName?: string | null;
    familyMember: ReminderFamilyRef | null;
  }[];
  activeMedications: {
    id: string;
    name: string;
    dosage?: string | null;
    familyMember: ReminderFamilyRef | null;
  }[];
  recentVitals: {
    id: string;
    label: string;
    value?: number | null;
    valueText?: string | null;
    unit?: string | null;
    measuredAt: string;
    familyMember: ReminderFamilyRef | null;
  }[];
  pendingReports: {
    id: string;
    original_filename: string;
    created_at: string;
    family_member: ReminderFamilyRef | null;
  }[];
  stats: {
    pendingReminders: number;
    completedToday: number;
    upcomingAppointments: number;
    reportsAwaitingSummary: number;
  };
}

export interface AdminReminderStats {
  totalReminders: number;
  pendingReminders: number;
  doneReminders: number;
  skippedReminders: number;
}

export interface SearchResultItem {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  date?: string;
  href: string;
  badge?: string;
  familyMemberId?: string | null;
}

export interface SearchResultsGroup {
  documents: SearchResultItem[];
  reports: SearchResultItem[];
  familyMembers: SearchResultItem[];
  conditions: SearchResultItem[];
  medications: SearchResultItem[];
  appointments: SearchResultItem[];
  reminders: SearchResultItem[];
  vitals: SearchResultItem[];
  insights?: SearchResultItem[];
  healthRisks?: SearchResultItem[];
  labTrends?: SearchResultItem[];
  notifications?: SearchResultItem[];
}

export interface SearchResponse {
  query: string;
  results: SearchResultsGroup;
  total: number;
}

export interface HealthInsight {
  id: string;
  familyMemberId: string | null;
  familyMember: ReminderFamilyRef | null;
  type: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical" | string;
  isRead: boolean;
  createdAt: string;
}

export interface InsightStats {
  total: number;
  unread: number;
  warnings: number;
  critical: number;
}

export interface InsightsResponse {
  items: HealthInsight[];
  stats: InsightStats;
}

export interface VitalTrendItem {
  measuredAt: string;
  label: string;
  value: number | null;
  unit: string | null;
}

export interface VitalTrendResponse {
  familyMember: { id: string; fullName: string };
  type: string;
  items: VitalTrendItem[];
  summary: {
    count: number;
    latest: number | null;
    average: number | null;
    min: number | null;
    max: number | null;
  };
}

export interface ReportComparisonResponse {
  familyMember: { id: string; fullName: string; relation: string };
  reports: {
    id: string;
    documentId: string;
    originalFilename: string;
    summary: string;
    keyFindings: unknown[];
    abnormalValues: unknown[];
    chartData: unknown[];
    healthScore: number | null;
    createdAt: string;
  }[];
  commonFindings: { title: string; count: number }[];
  abnormalHistory: {
    name: string;
    entries: { name: string; value: string; severity?: string; reportId: string; reportDate: string }[];
  }[];
  chartData: { label: string; value: number; unit?: string; date: string }[];
}

export interface AdminSearchResponse {
  query: string;
  results: {
    users: SearchResultItem[];
    documents: SearchResultItem[];
    reports: SearchResultItem[];
    familyMembers: SearchResultItem[];
    reminders: SearchResultItem[];
  };
  total: number;
}

export interface DoctorShareLink {
  id: string;
  shareUrl: string;
  recipientName?: string | null;
  recipientEmail?: string | null;
  note?: string | null;
  expiresAt: string;
  revokedAt?: string | null;
  accessCount: number;
  lastAccessedAt?: string | null;
  createdAt: string;
}

export interface DoctorQuestion {
  category: string;
  question: string;
  whyAsk: string;
}

export interface DoctorQuestionSet {
  id?: string;
  exists: boolean;
  reportId: string;
  summary: string | null;
  questions: DoctorQuestion[];
  aiModelUsed?: string | null;
  createdAt?: string;
  message?: string;
}

export interface LabTestReference {
  id: string;
  name: string;
  aliases?: string[] | null;
  category: string;
  unit?: string | null;
  normalMin?: number | null;
  normalMax?: number | null;
  normalText?: string | null;
  explanation: string;
  highMeaning?: string | null;
  lowMeaning?: string | null;
  disclaimer?: string;
}

export interface SymptomJournalEntry {
  id: string;
  familyMemberId: string | null;
  familyMember: ReminderFamilyRef | null;
  title: string;
  symptoms: string[];
  severity: number | null;
  mood: string | null;
  temperature: number | null;
  notes: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface CaregiverInvite {
  id: string;
  invitedEmail: string;
  invitedName?: string | null;
  role: string;
  status: string;
  inviteUrl?: string | null;
  expiresAt: string;
  canViewReports: boolean;
  canViewFamily: boolean;
  canAddNotes: boolean;
  canManageReminders: boolean;
}

export interface CaregiverAccessItem {
  id: string;
  caregiver: { id: string; name: string; email: string };
  role: string;
  canViewReports: boolean;
  canViewFamily: boolean;
  canAddNotes: boolean;
  canManageReminders: boolean;
  createdAt: string;
}

export interface SharingOverview {
  invites: CaregiverInvite[];
  caregivers: CaregiverAccessItem[];
}

export interface CaregiverSharedOwner {
  accessId: string;
  owner: { id: string; name: string; email: string };
  permissions: {
    canViewReports: boolean;
    canViewFamily: boolean;
    canAddNotes: boolean;
    canManageReminders: boolean;
    role: string;
  };
  familyMembers: { id: string; fullName: string; relation: string; bloodGroup: string | null }[];
  reports: {
    id: string;
    summary: string;
    healthScore: number | null;
    createdAt: string;
    originalFilename: string;
    familyMember: { fullName: string; relation: string } | null;
  }[];
  reminders: {
    id: string;
    title: string;
    scheduledAt: string;
    type: string;
    familyMemberName: string | null;
  }[];
}

export interface EmergencyHealthCard {
  id: string;
  familyMemberId: string | null;
  publicUrl: string;
  isEnabled: boolean;
  includeAllergies: boolean;
  includeMedications: boolean;
  includeConditions: boolean;
  includeEmergencyContacts: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface UserPreference {
  seniorMode: boolean;
  language: string;
  fontScale: "normal" | "large" | "extra_large";
  highContrast: boolean;
  reduceMotion: boolean;
  allowCloudTranslation: boolean;
}

export interface HealthRiskCard {
  id: string;
  title: string;
  level: "info" | "warning" | "critical";
  message: string;
  category?: string;
  status?: string;
  reportId?: string | null;
  documentId?: string | null;
  familyMember: ReminderFamilyRef | null;
  evidence: string[];
  suggestedActions?: string[];
  actions: { label: string; href: string }[];
}

export interface HealthRisksResponse {
  cards: HealthRiskCard[];
  stats: {
    total: number;
    critical: number;
    warning: number;
    info: number;
  };
  warning?: string;
}

export interface PostProcessingSummary {
  healthRisksCreated: number;
  insightsCreated: number;
  timelineEventsCreated: number;
  trendRecordsCreated: number;
  reminderSuggestionsCreated: number;
  notificationsCreated: number;
}

export interface PublicSharedReport {
  recipientName?: string | null;
  note?: string | null;
  expiresAt: string;
  report: {
    id: string;
    summary: string;
    keyFindings: KeyFinding[];
    abnormalValues: AbnormalValue[];
    foodRecommendations: string[];
    exerciseRecommendations: string[];
    lifestyleAdvice: string[];
    riskFlags: RiskFlag[];
    chartData: ChartDataPoint[];
    healthScore: number | null;
    createdAt: string;
    document: { originalFilename: string; createdAt: string };
    familyMember: { fullName: string; relation: string } | null;
  };
  disclaimer: string;
}

export interface FamilyMemberDetail extends FamilyMember {
  documents: FamilyDocument[];
  conditions?: { id: string; name: string; status: string; severity?: string | null; diagnosedOn?: string | null }[];
  allergies?: { id: string; name: string; severity?: string | null; reaction?: string | null }[];
  medications?: { id: string; name: string; dosage?: string | null; status: string; startDate?: string | null }[];
  vitals?: { id: string; type: string; label: string; value?: number | null; valueText?: string | null; unit?: string | null; measuredAt: string }[];
  appointments?: { id: string; title: string; doctorName?: string | null; hospitalName?: string | null; appointmentAt: string; status: string }[];
  emergencyContacts?: { id: string; name: string; relation?: string | null; phone: string; email?: string | null }[];
}

export type ChatSafetyLevel = "normal" | "caution" | "urgent";

export type ChatAskMode = "general" | "report" | "family";

export interface ChatSourceItem {
  type: string;
  id: string;
  title: string;
  date?: string;
  href?: string;
  familyMemberId?: string;
}

export interface ChatAskInput {
  message: string;
  mode: ChatAskMode;
  reportId?: string;
  familyMemberId?: string;
  threadId?: string;
  newThread?: boolean;
  retry?: boolean;
  retryOfMessageId?: string;
  language?: string;
}

export interface ChatAskResponse {
  threadId: string;
  answer: string;
  sources: ChatSourceItem[];
  safetyLevel: ChatSafetyLevel;
  suggestedQuestions: string[];
  assistantMessageId?: string;
}

export interface ChatThreadListItem {
  id: string;
  type: string;
  title: string | null;
  reportId: string | null;
  familyMemberId: string | null;
  updatedAt: string;
  messageCount?: number;
  lastMessagePreview?: string | null;
  lastMessage: string | null;
  reportFilename: string | null;
}
