"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { MobileShell } from "@/components/MobileShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { FamilyMemberForm } from "@/components/family/FamilyMemberForm";
import { api } from "@/lib/api-client";
import type { FamilyMemberInput } from "@/types";
import { ArrowLeft, Save } from "lucide-react";

const empty: FamilyMemberInput = {
  fullName: "",
  relation: "",
};

export default function NewFamilyMemberPage() {
  return (
    <ProtectedRoute>
      <NewFamilyMemberContent />
    </ProtectedRoute>
  );
}

function NewFamilyMemberContent() {
  const router = useRouter();
  const [form, setForm] = useState<FamilyMemberInput>(empty);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.fullName.trim().length < 2 || !form.relation) {
      setError("Name and relation are required");
      return;
    }
    setLoading(true);
    try {
      const created = await api.createFamilyMember(form);
      router.push(`/family/${created.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileShell>
      <AppHeader />
      <main className="mx-auto max-w-lg px-4 py-6 sm:py-10">
        <Link
          href="/family"
          className="inline-flex items-center text-sm text-gray-600 mb-4 min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Family Health
        </Link>
        <h1 className="text-xl font-bold text-gray-900 mb-6">Add family member</h1>
        {error && <Alert variant="error" className="mb-4">{error}</Alert>}
        <form onSubmit={handleSubmit}>
          <FamilyMemberForm value={form} onChange={setForm} />
          <Button type="submit" className="w-full mt-6 min-h-[48px]" disabled={loading}>
            <Save className="h-4 w-4" />
            {loading ? "Saving…" : "Save member"}
          </Button>
        </form>
      </main>
    </MobileShell>
  );
}
