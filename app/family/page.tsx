"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { MobileShell } from "@/components/MobileShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert } from "@/components/ui/Alert";
import { FamilyMemberCard } from "@/components/family/FamilyMemberCard";
import { FamilyStats } from "@/components/family/FamilyStats";
import { api } from "@/lib/api-client";
import type { FamilyMember, FamilyStats as FamilyStatsType } from "@/types";
import { Plus, Users } from "lucide-react";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function FamilyPage() {
  return (
    <ProtectedRoute>
      <FamilyContent />
    </ProtectedRoute>
  );
}

function FamilyContent() {
  const { t } = useTranslation();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getFamilyMembers()
      .then(setMembers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const stats: FamilyStatsType = useMemo(() => {
    const linkedReports = members.reduce((s, m) => s + m.documentCount, 0);
    const upcomingAppointments = members.filter((m) => m.nextAppointment).length;
    const activeMedications = members.reduce(
      (s, m) => s + (m.activeMedicationCount ?? 0),
      0
    );
    return {
      totalMembers: members.length,
      linkedReports,
      upcomingAppointments,
      activeMedications,
    };
  }, [members]);

  return (
    <MobileShell>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {t("family.title")}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Organize reports and health profiles
            </p>
          </div>
          <Link href="/family/new">
            <Button size="sm" className="min-h-[44px]">
              <Plus className="h-4 w-4" />
              {t("family.addMember")}
            </Button>
          </Link>
        </div>

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        ) : (
          <>
            <div className="mb-6">
              <FamilyStats stats={stats} />
            </div>

            {members.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 text-sm">
                  Add family members to organize reports for parents, spouse,
                  children, or yourself.
                </p>
                <Link href="/family/new" className="inline-block mt-4">
                  <Button>Add family member</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((m) => (
                  <FamilyMemberCard key={m.id} member={m} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </MobileShell>
  );
}
