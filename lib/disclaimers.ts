const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Vaidya GPT";

/** PDF / share pages — kept empty so exports stay clean for users. */
export const MEDICAL_DISCLAIMER = "";

export const MEDICAL_DISCLAIMER_EMERGENCY =
  "For life-threatening emergencies or severe symptoms, seek urgent in-person medical care immediately.";

export const MEDICAL_DISCLAIMER_REPORT = MEDICAL_DISCLAIMER_EMERGENCY;

export const CHAT_DATA_DISCLAIMER = "";

export const CHAT_UI_DISCLAIMER = "";

export const DATA_SOURCE_SUFFIX = "";

export const RISK_CARDS_HELPER = "";

export const DOCTOR_QUESTIONS_HELPER =
  "Helpful questions to discuss with your doctor.";

/** @deprecated Use CHAT_DATA_DISCLAIMER */
export const EDUCATIONAL_DISCLAIMER = CHAT_DATA_DISCLAIMER;
