const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Vaidya GPT";

/** Primary legal / PDF / share disclaimer — trust + saved data, not “educational”. */
export const MEDICAL_DISCLAIMER =
  `${APP_NAME} uses your uploaded reports and saved health data to explain results and support care planning. This is not a final diagnosis—confirm important decisions with your doctor.`;

export const MEDICAL_DISCLAIMER_EMERGENCY =
  "For life-threatening emergencies or severe symptoms, seek urgent in-person medical care immediately.";

export const MEDICAL_DISCLAIMER_REPORT = `${MEDICAL_DISCLAIMER} ${MEDICAL_DISCLAIMER_EMERGENCY}`;

/** AI system prompts and emergency replies */
export const CHAT_DATA_DISCLAIMER =
  "Answers are based on your saved health data. This is not a final medical diagnosis—confirm with your doctor.";

export const CHAT_UI_DISCLAIMER =
  `${APP_NAME} uses your saved reports and health data. Not a final diagnosis—confirm with your doctor.`;

/** Appended to generated insight / risk messages */
export const DATA_SOURCE_SUFFIX =
  "Based on your uploaded report data—not a final diagnosis.";

export const RISK_CARDS_HELPER =
  "Risk cards use your uploaded report data. Not a final diagnosis—discuss with your doctor.";

export const DOCTOR_QUESTIONS_HELPER =
  "Suggested questions from your saved report—for discussion with your doctor.";

/** @deprecated Use CHAT_DATA_DISCLAIMER */
export const EDUCATIONAL_DISCLAIMER = CHAT_DATA_DISCLAIMER;
