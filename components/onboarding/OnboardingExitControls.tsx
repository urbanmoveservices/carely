"use client";



import { Button } from "@/components/ui/Button";

import { useOnboardingActions } from "@/hooks/useOnboardingActions";

import { useTranslation } from "@/lib/i18n/use-translation";



/** Skip or leave onboarding without blocking the rest of the app */

export function OnboardingExitControls() {

  const {

    handleSkipOnboarding,

    handleGoToDashboard,

    loading,

    error,

  } = useOnboardingActions();

  const { t } = useTranslation();



  return (

    <div className="mt-6 space-y-3">

      <Button

        type="button"

        variant="outline"

        className="w-full"

        onClick={handleGoToDashboard}

        loading={loading}

        disabled={loading}

      >

        Go to Dashboard

      </Button>

      <div className="text-center">

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

        <p className="text-xs text-gray-400 mt-2 max-w-sm mx-auto">

          {t("onboarding.skipHelper")}

        </p>

      </div>

      {error && (

        <p className="text-sm text-amber-700 text-center" role="alert">

          {error}

        </p>

      )}

    </div>

  );

}


