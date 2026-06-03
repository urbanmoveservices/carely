export type SafetyLevel = "normal" | "caution" | "urgent";

export type SafetyHints = {
  level: SafetyLevel;
  isEmergency: boolean;
  isDiagnosisRequest: boolean;
  isPrescriptionRequest: boolean;
  isOutOfScope: boolean;
  guidanceForModel: string;
};

const EMERGENCY_RE =
  /chest pain|seene me dard|saans nahi|breathless|can't breathe|cannot breathe|stroke|face droop|severe bleeding|unconscious|behosh|suicide|suicidal|kill myself|heart attack|fainting|fainted|anaphylaxis|severe allergic/i;

const DIAGNOSIS_RE =
  /do i have|kya mujhe|mujhe .+ hai kya|diagnose|diagnosis|kya hai mujhe|am i diabetic|diabetes hai|heart disease hai/i;

const PRESCRIPTION_RE =
  /prescribe|dosage|dose|kitna dose|kitni dawa|kaunsi medicine|kaun si dawa|kon si dawa|konsi dawa|which medicine|medicine lu|dawa lu|tablet lu|start taking|stop taking|change medicine|cure kare|ilaj|treatment suggest|medicine batao/i;

export function classifyChatSafety(message: string): SafetyHints {
  const isEmergency = EMERGENCY_RE.test(message);
  const isDiagnosisRequest = DIAGNOSIS_RE.test(message);
  const isPrescriptionRequest = PRESCRIPTION_RE.test(message);

  if (isEmergency) {
    return {
      level: "urgent",
      isEmergency: true,
      isDiagnosisRequest,
      isPrescriptionRequest,
      isOutOfScope: false,
      guidanceForModel:
        "User may have emergency symptoms. Start answer with: Ye urgent ho sakta hai — turant emergency medical help ya doctor se contact karein (112 India). Then briefly explain what their saved report data shows if any — still do not diagnose.",
    };
  }

  if (isPrescriptionRequest) {
    return {
      level: "caution",
      isEmergency: false,
      isDiagnosisRequest,
      isPrescriptionRequest: true,
      isOutOfScope: false,
      guidanceForModel:
        "User asked which medicine to take and/or dosage. Do NOT prescribe or recommend medicines or doses. Explain relevant lab/report data. Mention only medicines already in saved activeMedications. Tell user to ask their doctor for treatment. Hindi/Hinglish OK.",
    };
  }

  if (isDiagnosisRequest) {
    return {
      level: "caution",
      isEmergency: false,
      isDiagnosisRequest: true,
      isPrescriptionRequest,
      isOutOfScope: false,
      guidanceForModel:
        "User asked for diagnosis. Do NOT say they have a disease. Explain relevant lab values from saved data in simple language (high/low), say ye diagnosis nahi hai, doctor se confirm karna chahiye.",
    };
  }

  return {
    level: "normal",
    isEmergency: false,
    isDiagnosisRequest: false,
    isPrescriptionRequest: false,
    isOutOfScope: false,
    guidanceForModel:
      "Answer directly and helpfully using only saved context. Use simple Hindi/Hinglish if user writes that way.",
  };
}
