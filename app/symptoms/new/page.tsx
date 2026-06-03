"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { MobileShell } from "@/components/MobileShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api-client";
import type { FamilyMember } from "@/types";

export default function NewSymptomPage() {
  return (
    <ProtectedRoute>
      <NewSymptomForm />
    </ProtectedRoute>
  );
}

function NewSymptomForm() {
  const router = useRouter();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [title, setTitle] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [severity, setSeverity] = useState(5);
  const [notes, setNotes] = useState("");
  const [familyMemberId, setFamilyMemberId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getFamilyMembers().then(setMembers).catch(() => {});
  }, []);

  const submit = async () => {
    setLoading(true);
    try {
      await api.createSymptomEntry({
        title,
        symptoms: symptoms.split(",").map((s) => s.trim()).filter(Boolean),
        severity,
        notes: notes || null,
        familyMemberId: familyMemberId || null,
        occurredAt: new Date().toISOString(),
      });
      router.push("/symptoms");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileShell>
      <AppHeader />
      <main className="mx-auto max-w-lg px-4 py-6 space-y-4">
        <h1 className="text-xl font-bold">New symptom note</h1>
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="min-h-[48px]" />
        </div>
        <div>
          <Label>Symptoms (comma-separated)</Label>
          <Input value={symptoms} onChange={(e) => setSymptoms(e.target.value)} className="min-h-[48px]" />
        </div>
        <div>
          <Label>Severity (1–10): {severity}</Label>
          <input
            type="range"
            min={1}
            max={10}
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div>
          <Label>Family member</Label>
          <select
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 min-h-[44px]"
            value={familyMemberId}
            onChange={(e) => setFamilyMemberId(e.target.value)}
          >
            <option value="">Myself</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <Button onClick={submit} loading={loading} className="w-full min-h-[48px]">
          Save
        </Button>
      </main>
    </MobileShell>
  );
}
