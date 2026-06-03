"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { MobileShell } from "@/components/MobileShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Alert } from "@/components/ui/Alert";
import { api } from "@/lib/api-client";
import type { SharingOverview } from "@/types";

export default function SharingPage() {
  return (
    <ProtectedRoute>
      <SharingContent />
    </ProtectedRoute>
  );
}

function SharingContent() {
  const [data, setData] = useState<SharingOverview | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const load = () => api.getSharingOverview().then(setData).catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const invite = async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await api.createCaregiverInvite({
        invitedEmail: email,
        invitedName: name || undefined,
        role: "viewer",
      });
      await navigator.clipboard.writeText(res.inviteUrl);
      setMsg("Invite link copied to clipboard");
      setEmail("");
      setName("");
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileShell>
      <AppHeader />
      <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
        <h1 className="text-xl font-bold text-gray-900">Family & Caregiver Sharing</h1>
        <p className="text-sm text-gray-500">
          Invite someone by email. They must sign up or log in with that email to accept. No email is sent yet—copy the invite link.
        </p>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Label>Name (optional)</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={invite} loading={loading} className="w-full min-h-[48px]">
            Create invite link
          </Button>
          {msg && <Alert variant="info">{msg}</Alert>}
        </div>
        {data && (
          <>
            <section>
              <h2 className="font-semibold text-gray-900 mb-2">Pending invites</h2>
              {data.invites.filter((i) => i.status === "pending").length === 0 ? (
                <p className="text-sm text-gray-500">None</p>
              ) : (
                <ul className="space-y-2">
                  {data.invites
                    .filter((i) => i.status === "pending")
                    .map((i) => (
                      <li key={i.id} className="text-sm rounded-xl border p-3 flex justify-between gap-2">
                        <span>
                          {i.invitedEmail}
                          <br />
                          <span className="text-xs text-gray-500">Expires {new Date(i.expiresAt).toLocaleDateString()}</span>
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            await api.revokeCaregiverInvite(i.id);
                            load();
                          }}
                        >
                          Revoke
                        </Button>
                      </li>
                    ))}
                </ul>
              )}
            </section>
            <section>
              <h2 className="font-semibold text-gray-900 mb-2">Active caregivers</h2>
              {data.caregivers.length === 0 ? (
                <p className="text-sm text-gray-500">None yet</p>
              ) : (
                <ul className="space-y-2">
                  {data.caregivers.map((c) => (
                    <li key={c.id} className="text-sm rounded-xl border p-3">
                      {c.caregiver.name} ({c.caregiver.email}) — {c.role}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </MobileShell>
  );
}
