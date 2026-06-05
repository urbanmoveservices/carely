"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppHeader } from "@/components/AppHeader";
import { MobileShell } from "@/components/MobileShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
type Prefs = {
  lifecycleEnabled: boolean;
  marketingEnabled: boolean;
  newsletterEnabled: boolean;
  productUpdatesEnabled: boolean;
  reminderEmailsEnabled: boolean;
  reportEmailsEnabled: boolean;
  billingEmailsEnabled: boolean;
};

export default function EmailPreferencesPage() {
  return (
    <ProtectedRoute>
      <Content />
    </ProtectedRoute>
  );
}

function Content() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/email/preferences", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.preferences) setPrefs(d.preferences);
      })
      .catch(console.error);
  }, []);

  async function save() {
    if (!prefs) return;
    setSaving(true);
    setMsg(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/email/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(prefs),
      });
      const data = await res.json();
      if (data.preferences) {
        setPrefs(data.preferences);
        setMsg({ type: "success", text: "Email preferences saved." });
      } else {
        setMsg({ type: "error", text: data.message || "Could not save." });
      }
    } catch {
      setMsg({ type: "error", text: "Could not save preferences." });
    } finally {
      setSaving(false);
    }
  }

  function toggle(key: keyof Prefs) {
    if (!prefs) return;
    setPrefs({ ...prefs, [key]: !prefs[key] });
  }

  return (
    <MobileShell>
      <AppHeader />
      <div className="p-4 max-w-lg mx-auto space-y-4">
        <h1 className="text-lg font-semibold text-gray-900">Email preferences</h1>
        <Link href="/settings" className="text-sm text-teal-700 hover:underline">
          ← Back to settings
        </Link>

        <Alert variant="info">
          Some account and security emails are required (verification, password reset, payment
          receipts).
        </Alert>

        {msg && <Alert variant={msg.type === "success" ? "success" : "error"}>{msg.text}</Alert>}

        {prefs && (
          <Card>
            <CardHeader>
              <CardTitle>What we can email you</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {(
                [
                  ["reportEmailsEnabled", "Report emails (upload received, summary ready)"],
                  ["reminderEmailsEnabled", "Reminder emails"],
                  ["lifecycleEnabled", "Lifecycle & helpful tips"],
                  ["billingEmailsEnabled", "Billing & plan updates"],
                  ["marketingEnabled", "Marketing & promotions"],
                  ["newsletterEnabled", "Monthly newsletter"],
                  ["productUpdatesEnabled", "Product updates & new features"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={prefs[key]}
                    onChange={() => toggle(key)}
                  />
                  <span>{label}</span>
                </label>
              ))}
              <Button onClick={save} disabled={saving} className="w-full mt-4">
                {saving ? "Saving…" : "Save preferences"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MobileShell>
  );
}
