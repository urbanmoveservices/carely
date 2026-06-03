"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { MobileShell } from "@/components/MobileShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert } from "@/components/ui/Alert";
import { FamilyTabs } from "@/components/family/FamilyTabs";
import { api } from "@/lib/api-client";
import {
  calculateAge,
  formatRelation,
  getInitials,
} from "@/lib/family-utils";
import type { FamilyMemberDetail } from "@/types";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

export default function FamilyMemberDetailPage() {
  return (
    <ProtectedRoute>
      <FamilyMemberDetailContent />
    </ProtectedRoute>
  );
}

function FamilyMemberDetailContent() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;
  const [member, setMember] = useState<FamilyMemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api
      .getFamilyMember(memberId)
      .then(setMember)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [memberId]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteFamilyMember(memberId);
      router.push("/family");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <MobileShell>
        <AppHeader />
        <main className="mx-auto max-w-2xl px-4 py-6">
          <Skeleton className="h-40 w-full rounded-2xl mb-4" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </main>
      </MobileShell>
    );
  }

  if (error && !member) {
    return (
      <MobileShell>
        <AppHeader />
        <main className="mx-auto max-w-2xl px-4 py-6">
          <Alert variant="error">{error}</Alert>
          <Link href="/family" className="mt-4 inline-block">
            <Button variant="outline">Back to Family</Button>
          </Link>
        </main>
      </MobileShell>
    );
  }

  if (!member) return null;

  const age = member.dateOfBirth ? calculateAge(member.dateOfBirth) : null;

  return (
    <MobileShell>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <Link
          href="/family"
          className="inline-flex items-center text-sm text-gray-600 mb-4 min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Family Health
        </Link>

        <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white p-5 mb-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-3 min-w-0">
              <div className="h-14 w-14 shrink-0 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
                {getInitials(member.fullName)}
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold truncate">{member.fullName}</h1>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="text-sm text-brand-100">
                    {formatRelation(member.relation)}
                  </span>
                  {age != null && (
                    <span className="text-sm text-brand-100">{age} years</span>
                  )}
                  {member.bloodGroup && (
                    <span className="text-sm text-brand-100">{member.bloodGroup}</span>
                  )}
                  {member.gender && (
                    <span className="text-sm text-brand-100 capitalize">
                      {member.gender.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Link href={`/family/${memberId}/edit`}>
              <Button
                variant="outline"
                size="sm"
                className="border-white/30 text-white hover:bg-white/10 bg-white/10 min-h-[44px]"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        <FamilyTabs member={member} />

        <div className="mt-8 pt-6 border-t border-gray-100">
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-sm text-red-600 flex items-center gap-1 min-h-[44px]"
            >
              <Trash2 className="h-4 w-4" /> Delete family member
            </button>
          ) : (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4">
              <p className="text-sm text-red-800 mb-3">
                Delete {member.fullName}? Linked reports will stay but won&apos;t be
                assigned to this member.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Confirm delete"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-6 text-center">
          AI-assisted health organizer with diagnosis and treatment guidance. Handle
          family data with consent and care.
        </p>
      </main>
    </MobileShell>
  );
}
