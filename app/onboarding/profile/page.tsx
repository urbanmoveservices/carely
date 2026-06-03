"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { OnboardingShell } from "@/components/OnboardingShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { OnboardingExitControls } from "@/components/onboarding/OnboardingExitControls";
import { api } from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n/use-translation";
import { BLOOD_GROUP_VALUES, GENDER_VALUES } from "@/lib/validators/profile";

export default function OnboardingProfilePage() {
  return (
    <ProtectedRoute>
      <OnboardingProfile />
    </ProtectedRoute>
  );
}

function OnboardingProfile() {
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [fullName, setFullName] = useState(user?.name || "");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [intent, setIntent] = useState<"self" | "family">("self");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const continueNext = async () => {
    setLoading(true);
    setError("");
    try {
      if (fullName.trim().length >= 2) {
        await api.updateProfile({
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim() || null,
          gender: gender || null,
          dateOfBirth: dateOfBirth || null,
          bloodGroup: bloodGroup || null,
        });
      }
      await api.updateOnboardingProfile({ name: fullName.trim(), intent });
      router.push("/onboarding/family");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not save profile");
    } finally {
      setLoading(false);
    }
  };

  const skipNext = async () => {
    setLoading(true);
    try {
      await api.updateOnboardingProfile({ intent });
      router.push("/onboarding/family");
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingShell step={2}>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Your profile</h1>
      <p className="text-sm text-gray-500 mb-2">
        Complete profile for better reports, doctor packs, and payments.
      </p>
      <p className="text-xs text-gray-400 mb-6">
        You can skip optional fields now and update later in{" "}
        <Link href="/settings/profile" className="text-brand-600 underline">
          Settings → Profile
        </Link>
        .
      </p>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="h-11"
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="10-digit mobile (for Razorpay)"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="h-11"
          />
        </div>
        <div>
          <Label htmlFor="gender">Gender</Label>
          <select
            id="gender"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm h-11"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="">Optional</option>
            {GENDER_VALUES.map((g) => (
              <option key={g} value={g}>
                {g.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="dob">Date of birth (optional)</Label>
          <Input
            id="dob"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className="h-11"
          />
        </div>
        <div>
          <Label htmlFor="blood">Blood group (optional)</Label>
          <select
            id="blood"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm h-11"
            value={bloodGroup}
            onChange={(e) => setBloodGroup(e.target.value)}
          >
            <option value="">Optional</option>
            {BLOOD_GROUP_VALUES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>How will you use Vaidya GPT?</Label>
          <div className="mt-2 grid grid-cols-1 gap-2">
            {(
              [
                ["self", "I'm using this for myself"],
                ["family", "I'm managing family health"],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setIntent(val)}
                className={`rounded-xl border px-4 py-3 text-left text-sm ${
                  intent === val
                    ? "border-brand-600 bg-brand-50 text-brand-800"
                    : "border-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Button className="w-full mt-8" onClick={continueNext} loading={loading}>
        {t("common.continue")}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="w-full mt-2"
        onClick={skipNext}
        disabled={loading}
      >
        Skip optional fields
      </Button>
      <OnboardingExitControls />
    </OnboardingShell>
  );
}
