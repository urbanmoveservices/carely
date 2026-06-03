"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { MobileShell } from "@/components/MobileShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ReminderForm } from "@/components/reminders/ReminderForm";
import { api } from "@/lib/api-client";
import type { ReminderInput, FamilyMember } from "@/types";
import { ArrowLeft, Save } from "lucide-react";

const defaultForm = (): ReminderInput => ({
  type: "custom",
  title: "",
  scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  repeatType: "none",
  familyMemberId: null,
});

function NewReminderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preMember = searchParams.get("familyMemberId");

  const [form, setForm] = useState<ReminderInput>(defaultForm);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getFamilyMembers().then(setMembers).catch(() => {});
    if (preMember) {
      setForm((f) => ({ ...f, familyMemberId: preMember }));
    }
  }, [preMember]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.title.trim().length < 2) {
      setError("Title is required");
      return;
    }
    setLoading(true);
    try {
      await api.createReminder(form);
      router.push(preMember ? `/family/${preMember}` : "/reminders");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-lg px-4 py-6 sm:py-10">
      <Link
        href={preMember ? `/family/${preMember}` : "/reminders"}
        className="inline-flex items-center text-sm text-gray-600 mb-4 min-h-[44px]"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Link>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Add reminder</h1>
      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      <form onSubmit={handleSubmit}>
        <ReminderForm
          value={form}
          onChange={setForm}
          members={members}
          lockFamilyMember={!!preMember}
        />
        <Button type="submit" className="w-full mt-6 min-h-[48px]" disabled={loading}>
          <Save className="h-4 w-4" />
          {loading ? "Saving…" : "Save reminder"}
        </Button>
      </form>
    </main>
  );
}

export default function NewReminderPage() {
  return (
    <ProtectedRoute>
      <MobileShell>
        <AppHeader />
        <Suspense fallback={<div className="p-4">Loading…</div>}>
          <NewReminderForm />
        </Suspense>
      </MobileShell>
    </ProtectedRoute>
  );
}
