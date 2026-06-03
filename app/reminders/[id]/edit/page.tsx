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
import { ReminderForm } from "@/components/reminders/ReminderForm";
import { api } from "@/lib/api-client";
import type { ReminderInput, FamilyMember } from "@/types";
import { ArrowLeft, Save } from "lucide-react";

export default function EditReminderPage() {
  return (
    <ProtectedRoute>
      <EditReminderContent />
    </ProtectedRoute>
  );
}

function EditReminderContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [form, setForm] = useState<ReminderInput | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.getReminder(id), api.getFamilyMembers()])
      .then(([r, m]) => {
        setForm({
          familyMemberId: r.familyMemberId,
          type: r.type,
          title: r.title,
          description: r.description,
          scheduledAt: r.scheduledAt,
          repeatType: r.repeatType,
        });
        setMembers(m);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      await api.updateReminder(id, form);
      router.push("/reminders");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MobileShell>
      <AppHeader />
      <main className="mx-auto max-w-lg px-4 py-6 sm:py-10">
        <Link href="/reminders" className="inline-flex items-center text-sm text-gray-600 mb-4 min-h-[44px]">
          <ArrowLeft className="h-4 w-4 mr-1" /> Reminders
        </Link>
        <h1 className="text-xl font-bold text-gray-900 mb-6">Edit reminder</h1>
        {error && <Alert variant="error" className="mb-4">{error}</Alert>}
        {loading || !form ? (
          <Skeleton className="h-96 rounded-2xl" />
        ) : (
          <form onSubmit={handleSubmit}>
            <ReminderForm value={form} onChange={setForm} members={members} />
            <Button type="submit" className="w-full mt-6 min-h-[48px]" disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </form>
        )}
      </main>
    </MobileShell>
  );
}
