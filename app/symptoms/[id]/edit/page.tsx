"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { MobileShell } from "@/components/MobileShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api-client";

export default function EditSymptomPage() {
  return (
    <ProtectedRoute>
      <EditSymptomForm />
    </ProtectedRoute>
  );
}

function EditSymptomForm() {
  const { id } = useParams();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [severity, setSeverity] = useState(5);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getSymptomEntry(id as string)
      .then((e) => {
        setTitle(e.title);
        setSymptoms((e.symptoms as string[]).join(", "));
        setSeverity(e.severity ?? 5);
        setNotes(e.notes || "");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return null;

  return (
    <MobileShell>
      <AppHeader />
      <main className="mx-auto max-w-lg px-4 py-6 space-y-4">
        <h1 className="text-xl font-bold">Edit symptom note</h1>
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>Symptoms</Label>
          <Input value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
        </div>
        <div>
          <Label>Severity: {severity}</Label>
          <input type="range" min={1} max={10} value={severity} onChange={(e) => setSeverity(Number(e.target.value))} className="w-full" />
        </div>
        <div>
          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <Button
          loading={saving}
          className="w-full min-h-[48px]"
          onClick={async () => {
            setSaving(true);
            try {
              await api.updateSymptomEntry(id as string, {
                title,
                symptoms: symptoms.split(",").map((s) => s.trim()).filter(Boolean),
                severity,
                notes: notes || null,
              });
              router.push("/symptoms");
            } finally {
              setSaving(false);
            }
          }}
        >
          Save
        </Button>
        <Button
          variant="outline"
          className="w-full min-h-[48px] text-red-600"
          onClick={async () => {
            await api.deleteSymptomEntry(id as string);
            router.push("/symptoms");
          }}
        >
          Delete
        </Button>
      </main>
    </MobileShell>
  );
}
