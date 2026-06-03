import type { User } from "@prisma/client";
import prisma from "@/lib/prisma";
import { formatPhoneForRazorpay, isValidIndianPhone } from "@/lib/phone";

export type ProfileCompletionFlags = {
  billingProfileCompleted: boolean;
  medicalProfileCompleted: boolean;
  profileCompleted: boolean;
};

export function computeAge(dateOfBirth: Date | null | undefined): number | null {
  if (!dateOfBirth) return null;
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const m = today.getMonth() - dateOfBirth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dateOfBirth.getDate())) age--;
  return age >= 0 && age <= 120 ? age : null;
}

export function evaluateProfileCompletion(user: {
  name: string;
  email: string;
  phoneNumber: string | null;
  gender: string | null;
  dateOfBirth: Date | null;
  bloodGroup: string | null;
}): ProfileCompletionFlags {
  const billingProfileCompleted = Boolean(
    user.name?.trim().length >= 2 &&
      user.email?.trim() &&
      user.phoneNumber &&
      isValidIndianPhone(user.phoneNumber)
  );

  const medicalProfileCompleted = Boolean(
    user.gender &&
      (user.dateOfBirth || computeAge(user.dateOfBirth) !== null) &&
      user.bloodGroup
  );

  const profileCompleted = billingProfileCompleted && medicalProfileCompleted;

  return { billingProfileCompleted, medicalProfileCompleted, profileCompleted };
}

export function serializeUserProfile(
  user: User,
  languageOverride?: string | null
) {
  const flags = evaluateProfileCompletion(user);
  const age = computeAge(user.dateOfBirth);
  const lang = languageOverride ?? user.preferredLanguage ?? "en";

  return {
    id: user.id,
    fullName: user.name,
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    gender: user.gender,
    dateOfBirth: user.dateOfBirth?.toISOString().slice(0, 10) ?? null,
    age,
    bloodGroup: user.bloodGroup,
    heightCm: user.heightCm,
    weightKg: user.weightKg,
    bmi:
      user.heightCm && user.weightKg
        ? Math.round((user.weightKg / ((user.heightCm / 100) ** 2)) * 10) / 10
        : null,
    maritalStatus: user.maritalStatus,
    occupation: user.occupation,
    addressLine1: user.addressLine1,
    addressLine2: user.addressLine2,
    city: user.city,
    state: user.state,
    pincode: user.pincode,
    country: user.country ?? "India",
    emergencyContactName: user.emergencyContactName,
    emergencyContactRelation: user.emergencyContactRelation,
    emergencyContactPhone: user.emergencyContactPhone,
    preferredLanguage: lang,
    knownConditionsSummary: user.knownConditionsSummary,
    allergiesSummary: user.allergiesSummary,
    currentMedicationsSummary: user.currentMedicationsSummary,
    emailChangeNote:
      "Email changes require verification. Contact support if you need to update your login email.",
    ...flags,
  };
}

export function getRazorpayPrefill(user: {
  name: string;
  email: string;
  phoneNumber: string | null;
}) {
  return {
    name: user.name?.trim() || "",
    email: user.email?.trim() || "",
    contact: formatPhoneForRazorpay(user.phoneNumber) || "",
  };
}

export function buildProfileUpdateData(
  parsed: Record<string, unknown>
): Partial<User> {
  const data: Record<string, unknown> = {};

  if (typeof parsed.fullName === "string") data.name = parsed.fullName;
  if (parsed.phoneNumber !== undefined) data.phoneNumber = parsed.phoneNumber;
  if (parsed.gender !== undefined) data.gender = parsed.gender;
  if (parsed.dateOfBirth !== undefined) data.dateOfBirth = parsed.dateOfBirth;
  if (parsed.bloodGroup !== undefined) data.bloodGroup = parsed.bloodGroup;
  if (parsed.heightCm !== undefined) data.heightCm = parsed.heightCm;
  if (parsed.weightKg !== undefined) data.weightKg = parsed.weightKg;
  if (parsed.maritalStatus !== undefined) data.maritalStatus = parsed.maritalStatus;
  if (parsed.occupation !== undefined) data.occupation = parsed.occupation;
  if (parsed.addressLine1 !== undefined) data.addressLine1 = parsed.addressLine1;
  if (parsed.addressLine2 !== undefined) data.addressLine2 = parsed.addressLine2;
  if (parsed.city !== undefined) data.city = parsed.city;
  if (parsed.state !== undefined) data.state = parsed.state;
  if (parsed.pincode !== undefined) data.pincode = parsed.pincode;
  if (parsed.country !== undefined) data.country = parsed.country;
  if (parsed.emergencyContactName !== undefined) {
    data.emergencyContactName = parsed.emergencyContactName;
  }
  if (parsed.emergencyContactRelation !== undefined) {
    data.emergencyContactRelation = parsed.emergencyContactRelation;
  }
  if (parsed.emergencyContactPhone !== undefined) {
    data.emergencyContactPhone = parsed.emergencyContactPhone;
  }
  if (parsed.preferredLanguage !== undefined) {
    data.preferredLanguage = parsed.preferredLanguage;
  }
  if (parsed.knownConditionsSummary !== undefined) {
    data.knownConditionsSummary = parsed.knownConditionsSummary;
  }
  if (parsed.allergiesSummary !== undefined) {
    data.allergiesSummary = parsed.allergiesSummary;
  }
  if (parsed.currentMedicationsSummary !== undefined) {
    data.currentMedicationsSummary = parsed.currentMedicationsSummary;
  }

  return data as Partial<User>;
}

export async function applyProfileCompletionFlags(
  userId: string,
  user: User
): Promise<ProfileCompletionFlags> {
  const flags = evaluateProfileCompletion(user);
  await prisma.user.update({
    where: { id: userId },
    data: flags,
  });
  return flags;
}

/** Patient context for doctor pack / reports (account holder, not family member) */
export function accountHolderPatientContext(user: User) {
  return {
    name: user.name,
    relation: "self",
    gender: user.gender,
    dateOfBirth: user.dateOfBirth?.toISOString().slice(0, 10) ?? null,
    age: computeAge(user.dateOfBirth),
    bloodGroup: user.bloodGroup,
    phone: user.phoneNumber,
    emergencyContact: user.emergencyContactName
      ? {
          name: user.emergencyContactName,
          relation: user.emergencyContactRelation,
          phone: user.emergencyContactPhone,
        }
      : null,
    allergiesSummary: user.allergiesSummary,
    conditionsSummary: user.knownConditionsSummary,
    medicationsSummary: user.currentMedicationsSummary,
  };
}
