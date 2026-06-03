"use client";



import { OnboardingShell } from "@/components/OnboardingShell";

import { Button } from "@/components/ui/Button";

import { ProtectedRoute } from "@/components/ProtectedRoute";

import { useOnboardingActions } from "@/hooks/useOnboardingActions";

import { CheckCircle2 } from "lucide-react";



export default function OnboardingCompletePage() {

  return (

    <ProtectedRoute>

      <OnboardingComplete />

    </ProtectedRoute>

  );

}



function OnboardingComplete() {

  const { handleCompleteOnboarding, handleSkipOnboarding, loading, error } =
    useOnboardingActions();



  return (

    <OnboardingShell step={4}>

      <div className="text-center py-6">

        <CheckCircle2 className="mx-auto h-14 w-14 text-brand-600 mb-4" />

        <h1 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re all set!</h1>

        <p className="text-gray-600 mb-8">

          Your Vaidya GPT account is ready. Explore your dashboard, upload reports,

          and manage family health.

        </p>

        {error && (

          <p className="text-sm text-amber-700 mb-4" role="alert">

            {error}

          </p>

        )}

        <Button

          size="lg"

          className="w-full"

          onClick={handleCompleteOnboarding}

          loading={loading}

          disabled={loading}

        >

          Go to Dashboard

        </Button>

        <div className="mt-4 text-center">

          <Button

            type="button"

            variant="ghost"

            className="text-gray-600"

            onClick={handleSkipOnboarding}

            loading={loading}

            disabled={loading}

          >

            Skip for now

          </Button>

        </div>

      </div>

    </OnboardingShell>

  );

}


