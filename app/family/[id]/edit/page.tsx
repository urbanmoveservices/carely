"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { MobileShell } from "@/components/MobileShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Skeleton";
import { FamilyMemberForm } from "@/components/family/FamilyMemberForm";
import { api } from "@/lib/api-client";
import type { FamilyMemberDetail, FamilyMemberInput } from "@/types";
import { ArrowLeft, Save } from "lucide-react";

export default function EditFamilyMemberPage() {
  return (
    <ProtectedRoute>
      <EditFamilyMemberContent />
    </ProtectedRoute>
  );
}

function EditFamilyMemberContent() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;
  const [loadingData, setLoadingData] = useState(true);
  const [form, setForm] = useState<FamilyMemberInput>({ fullName: "", relation: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getFamilyMember(memberId)
      .then((m: FamilyMemberDetail) => {
        setForm({
          fullName: m.fullName,
          relation: m.relation,
          dateOfBirth: m.dateOfBirth,
          gender: m.gender,
          bloodGroup: m.bloodGroup ?? null,
          phone: m.phone,
          email: m.email ?? null,
          notes: m.notes,
          heightCm: m.heightCm ?? null,
          weightKg: m.weightKg ?? null,
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingData(false));
  }, [memberId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateFamilyMember(memberId, form);
      router.push(`/family/${memberId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) {
    return (
      <MobileShell>
        <AppHeader />
        <main className="mx-auto max-w-lg px-4 py-6">
          <Skeleton className="h-96 w-full rounded-2xl" />
        </main>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <AppHeader />
      <main className="mx-auto max-w-lg px-4 py-6 sm:py-10">
        <Link href={`/family/${memberId}`} className="inline-flex items-center text-sm text-gray-600 mb-4 min-h-[44px]">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Link>
        <h1 className="text-xl font-bold text-gray-900 mb-6">Edit profile</h1>
        {error && <Alert variant="error" className="mb-4">{error}</Alert>}
        <form onSubmit={handleSubmit}>
          <FamilyMemberForm value={form} onChange={setForm} />
          <Button type="submit" loading={saving} className="w-full mt-6 min-h-[48px]">
            <Save className="h-4 w-4" /> Save changes
          </Button>
        </form>
      </main>
    </MobileShell>
  );
}
