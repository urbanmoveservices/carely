"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { api } from "@/lib/api-client";

export default function InvitePage() {
  const { token } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [info, setInfo] = useState<{
    invitedEmail: string;
    ownerName: string;
    expired: boolean;
    status: string;
  } | null>(null);
  const [msg, setMsg] = useState("");
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    fetch(`/api/caregiver-invites/token/${token}`)
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => setInfo(null));
  }, [token]);

  const accept = async () => {
    setAccepting(true);
    setMsg("");
    try {
      await api.acceptCaregiverInvite(token as string);
      router.push("/caregiver");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Could not accept invite");
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Caregiver invite</h1>
        {!info ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : info.expired || info.status !== "pending" ? (
          <Alert variant="error">This invite is no longer valid.</Alert>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4">
              <strong>{info.ownerName}</strong> invited <strong>{info.invitedEmail}</strong> to view shared health data.
            </p>
            {authLoading ? null : !user ? (
              <>
                <p className="text-sm text-gray-500 mb-4">Sign in with {info.invitedEmail} to accept.</p>
                <Link href={`/login?redirect=/invite/${token}`}>
                  <Button className="w-full min-h-[48px]">Log in</Button>
                </Link>
                <Link href={`/signup?redirect=/invite/${token}`} className="block text-center text-sm text-brand-600 mt-3">
                  Create account
                </Link>
              </>
            ) : user.email.toLowerCase() !== info.invitedEmail.toLowerCase() ? (
              <Alert variant="warning">
                You are logged in as {user.email}. This invite was sent to {info.invitedEmail}.
              </Alert>
            ) : (
              <>
                <Button onClick={accept} loading={accepting} className="w-full min-h-[48px]">
                  Accept invite
                </Button>
                {msg && <Alert variant="error" className="mt-3">{msg}</Alert>}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
