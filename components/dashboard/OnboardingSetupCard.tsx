"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/Button";
import { useOnboardingActions } from "@/hooks/useOnboardingActions";

export function OnboardingSetupCard() {
  const { user } = useAuth();
  const { handleDismissOnboarding, loading, error } = useOnboardingActions();

  if (!user || user.onboardingCompleted || user.role === "admin") {
    return null;
  }

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/80 p-4 sm:p-5 mb-6 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900">
        Finish setting up your account
      </h2>
      <p className="text-sm text-gray-600 mt-1 mb-4">
        Add family members and upload your first report whenever you are ready.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <Link href="/onboarding" className="flex-1">
          <Button className="w-full min-h-[44px]">Continue Setup</Button>
        </Link>
        <Button
          type="button"
          variant="outline"
          className="flex-1 min-h-[44px]"
          onClick={handleDismissOnboarding}
          loading={loading}
          disabled={loading}
        >
          Dismiss
        </Button>
      </div>
      {error && (
        <p className="text-xs text-amber-700 mt-2" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
