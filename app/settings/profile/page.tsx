"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { MobileShell } from "@/components/MobileShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api-client";
import { useAuth } from "@/components/AuthProvider";
import type { UserProfile } from "@/types";
import {
  BLOOD_GROUP_VALUES,
  GENDER_VALUES,
  MARITAL_STATUS_VALUES,
} from "@/lib/validators/profile";
import { ArrowLeft, Save } from "lucide-react";

const LANG_OPTIONS = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
];

function ProfileForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const nextUrl = searchParams.get("next") || "/settings";
  const reason = searchParams.get("reason");

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [form, setForm] = useState({
    fullName: "",
    phoneNumber: "",
    gender: "",
    dateOfBirth: "",
    bloodGroup: "",
    heightCm: "",
    weightKg: "",
    maritalStatus: "",
    occupation: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    emergencyContactName: "",
    emergencyContactRelation: "",
    emergencyContactPhone: "",
    preferredLanguage: "en",
    knownConditionsSummary: "",
    allergiesSummary: "",
    currentMedicationsSummary: "",
  });

  useEffect(() => {
    api
      .getProfile()
      .then((p) => {
        setProfile(p);
        setForm({
          fullName: p.fullName || "",
          phoneNumber: p.phoneNumber?.replace(/^\+91/, "") || "",
          gender: p.gender || "",
          dateOfBirth: p.dateOfBirth || "",
          bloodGroup: p.bloodGroup || "",
          heightCm: p.heightCm != null ? String(p.heightCm) : "",
          weightKg: p.weightKg != null ? String(p.weightKg) : "",
          maritalStatus: p.maritalStatus || "",
          occupation: p.occupation || "",
          addressLine1: p.addressLine1 || "",
          addressLine2: p.addressLine2 || "",
          city: p.city || "",
          state: p.state || "",
          pincode: p.pincode || "",
          country: p.country || "India",
          emergencyContactName: p.emergencyContactName || "",
          emergencyContactRelation: p.emergencyContactRelation || "",
          emergencyContactPhone:
            p.emergencyContactPhone?.replace(/^\+91/, "") || "",
          preferredLanguage: p.preferredLanguage || "en",
          knownConditionsSummary: p.knownConditionsSummary || "",
          allergiesSummary: p.allergiesSummary || "",
          currentMedicationsSummary: p.currentMedicationsSummary || "",
        });
      })
      .catch((e: Error) => setMsg({ type: "error", text: e.message }))
      .finally(() => setLoading(false));
  }, []);

  const bmi =
    form.heightCm && form.weightKg
      ? (
          parseFloat(form.weightKg) /
          (parseFloat(form.heightCm) / 100) ** 2
        ).toFixed(1)
      : null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const updated = await api.updateProfile({
        fullName: form.fullName.trim(),
        phoneNumber: form.phoneNumber.trim() || null,
        gender: form.gender || null,
        dateOfBirth: form.dateOfBirth || null,
        bloodGroup: form.bloodGroup || null,
        heightCm: form.heightCm ? parseFloat(form.heightCm) : null,
        weightKg: form.weightKg ? parseFloat(form.weightKg) : null,
        maritalStatus: form.maritalStatus || null,
        occupation: form.occupation || null,
        addressLine1: form.addressLine1 || null,
        addressLine2: form.addressLine2 || null,
        city: form.city || null,
        state: form.state || null,
        pincode: form.pincode || null,
        country: form.country || null,
        emergencyContactName: form.emergencyContactName || null,
        emergencyContactRelation: form.emergencyContactRelation || null,
        emergencyContactPhone: form.emergencyContactPhone.trim() || null,
        preferredLanguage: form.preferredLanguage,
        knownConditionsSummary: form.knownConditionsSummary || null,
        allergiesSummary: form.allergiesSummary || null,
        currentMedicationsSummary: form.currentMedicationsSummary || null,
      });
      setProfile(updated);
      setMsg({ type: "success", text: "Profile saved successfully." });
      await refreshUser?.();
      if (reason === "billing" && updated.billingProfileCompleted) {
        setTimeout(() => router.push(nextUrl), 800);
      }
    } catch (err: unknown) {
      setMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save profile",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <p className="text-sm text-gray-500 py-8 text-center">Loading profile…</p>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
      <Link
        href={nextUrl}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <div>
        <h1 className="text-xl font-bold text-gray-900">Profile & Patient Details</h1>
        <p className="text-sm text-gray-600 mt-1">
          Hospital-style details for reports, doctor packs, emergency card, and Razorpay
          payments.
        </p>
      </div>

      {reason === "billing" && (
        <Alert variant="warning">
          Add your phone number to upgrade with Razorpay. Name, email, and phone are
          required for checkout.
        </Alert>
      )}

      {msg && (
        <Alert variant={msg.type === "success" ? "success" : "error"}>{msg.text}</Alert>
      )}

      {profile && (
        <div className="grid gap-2 sm:grid-cols-3">
          <CompletionCard
            label="Billing"
            complete={profile.billingProfileCompleted}
            hint="Name, email, phone"
          />
          <CompletionCard
            label="Medical"
            complete={profile.medicalProfileCompleted}
            hint="Gender, DOB, blood group"
          />
          <CompletionCard
            label="Overall"
            complete={profile.profileCompleted}
            hint="Billing + medical basics"
          />
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <Section title="Basic details">
          <Field label="Full name *" id="fullName">
            <Input
              id="fullName"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="h-11"
            />
          </Field>
          <Field label="Email" id="email">
            <Input
              id="email"
              value={profile?.email || ""}
              readOnly
              className="h-11 bg-gray-50"
            />
            <p className="text-xs text-gray-500 mt-1">{profile?.emailChangeNote}</p>
          </Field>
          <Field label="Phone number *" id="phone">
            <Input
              id="phone"
              type="tel"
              placeholder="10-digit mobile"
              value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              className="h-11"
            />
          </Field>
          <Field label="Gender" id="gender">
            <select
              id="gender"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm h-11"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              <option value="">Select</option>
              {GENDER_VALUES.map((g) => (
                <option key={g} value={g}>
                  {g.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date of birth" id="dob">
            <Input
              id="dob"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
              className="h-11"
            />
          </Field>
          <Field label="Preferred language" id="lang">
            <select
              id="lang"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm h-11"
              value={form.preferredLanguage}
              onChange={(e) =>
                setForm({ ...form, preferredLanguage: e.target.value })
              }
            >
              {LANG_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </Section>

        <Section title="Medical basics">
          <Field label="Blood group" id="blood">
            <select
              id="blood"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm h-11"
              value={form.bloodGroup}
              onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
            >
              <option value="">Select</option>
              {BLOOD_GROUP_VALUES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Height (cm)" id="height">
              <Input
                id="height"
                type="number"
                value={form.heightCm}
                onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
                className="h-11"
              />
            </Field>
            <Field label="Weight (kg)" id="weight">
              <Input
                id="weight"
                type="number"
                value={form.weightKg}
                onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                className="h-11"
              />
            </Field>
          </div>
          {bmi && (
            <p className="text-sm text-gray-600">
              BMI: <span className="font-medium">{bmi}</span>
            </p>
          )}
          <Field label="Marital status" id="marital">
            <select
              id="marital"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm h-11"
              value={form.maritalStatus}
              onChange={(e) => setForm({ ...form, maritalStatus: e.target.value })}
            >
              <option value="">Select</option>
              {MARITAL_STATUS_VALUES.map((m) => (
                <option key={m} value={m}>
                  {m.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Occupation" id="occupation">
            <Input
              id="occupation"
              value={form.occupation}
              onChange={(e) => setForm({ ...form, occupation: e.target.value })}
              className="h-11"
            />
          </Field>
        </Section>

        <Section title="Address">
          <Field label="Address line 1" id="addr1">
            <Input
              id="addr1"
              value={form.addressLine1}
              onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
              className="h-11"
            />
          </Field>
          <Field label="Address line 2" id="addr2">
            <Input
              id="addr2"
              value={form.addressLine2}
              onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
              className="h-11"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City" id="city">
              <Input
                id="city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="h-11"
              />
            </Field>
            <Field label="State" id="state">
              <Input
                id="state"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="h-11"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pincode" id="pin">
              <Input
                id="pin"
                value={form.pincode}
                onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                className="h-11"
                maxLength={6}
              />
            </Field>
            <Field label="Country" id="country">
              <Input
                id="country"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="h-11"
              />
            </Field>
          </div>
        </Section>

        <Section title="Emergency contact">
          <Field label="Contact name" id="ecName">
            <Input
              id="ecName"
              value={form.emergencyContactName}
              onChange={(e) =>
                setForm({ ...form, emergencyContactName: e.target.value })
              }
              className="h-11"
            />
          </Field>
          <Field label="Relation" id="ecRel">
            <Input
              id="ecRel"
              value={form.emergencyContactRelation}
              onChange={(e) =>
                setForm({ ...form, emergencyContactRelation: e.target.value })
              }
              className="h-11"
            />
          </Field>
          <Field label="Contact phone" id="ecPhone">
            <Input
              id="ecPhone"
              type="tel"
              value={form.emergencyContactPhone}
              onChange={(e) =>
                setForm({ ...form, emergencyContactPhone: e.target.value })
              }
              className="h-11"
            />
          </Field>
        </Section>

        <Section title="Health summary (optional)">
          <Field label="Known conditions" id="cond">
            <textarea
              id="cond"
              rows={2}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              value={form.knownConditionsSummary}
              onChange={(e) =>
                setForm({ ...form, knownConditionsSummary: e.target.value })
              }
            />
          </Field>
          <Field label="Allergies" id="allergy">
            <textarea
              id="allergy"
              rows={2}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              value={form.allergiesSummary}
              onChange={(e) => setForm({ ...form, allergiesSummary: e.target.value })}
            />
          </Field>
          <Field label="Current medicines" id="meds">
            <textarea
              id="meds"
              rows={2}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              value={form.currentMedicationsSummary}
              onChange={(e) =>
                setForm({ ...form, currentMedicationsSummary: e.target.value })
              }
            />
          </Field>
        </Section>

        <Button type="submit" loading={saving} className="w-full h-11">
          <Save className="h-4 w-4" />
          Save profile
        </Button>
      </form>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {children}
    </div>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function CompletionCard({
  label,
  complete,
  hint,
}: {
  label: string;
  complete: boolean;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <Badge variant={complete ? "success" : "warning"} className="mt-1">
        {complete ? "Complete" : "Incomplete"}
      </Badge>
      <p className="text-[10px] text-gray-400 mt-1">{hint}</p>
    </div>
  );
}

export default function SettingsProfilePage() {
  return (
    <ProtectedRoute>
      <MobileShell>
        <AppHeader />
        <Suspense fallback={<p className="p-6 text-center text-sm">Loading…</p>}>
          <ProfileForm />
        </Suspense>
      </MobileShell>
    </ProtectedRoute>
  );
}
