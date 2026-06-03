"use client";



import { useState, useCallback } from "react";

import { useRouter } from "next/navigation";

import { useAuth } from "@/components/AuthProvider";

import { api } from "@/lib/api-client";



export function useOnboardingActions() {

  const router = useRouter();

  const { refreshUser, updateUser } = useAuth();

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);



  const finishOnboarding = useCallback(

    async (skipped = false) => {

      setLoading(true);

      setError(null);

      let apiFailed = false;

      try {

        const res = await api.completeOnboarding(skipped);

        if (res.user) {

          updateUser({ ...res.user, onboardingCompleted: true });

        } else {

          updateUser({ onboardingCompleted: true });

        }

      } catch {

        apiFailed = true;

        updateUser({ onboardingCompleted: true });

        setError(

          "Could not save setup status on the server. You can still use the app."

        );

      } finally {

        setLoading(false);

        router.replace("/dashboard");

        void refreshUser();

      }

      return { apiFailed };

    },

    [router, refreshUser, updateUser]

  );



  const handleSkipOnboarding = useCallback(

    () => finishOnboarding(true),

    [finishOnboarding]

  );



  const handleCompleteOnboarding = useCallback(

    () => finishOnboarding(false),

    [finishOnboarding]

  );



  const handleGoToDashboard = useCallback(

    () => finishOnboarding(true),

    [finishOnboarding]

  );

  const handleDismissOnboarding = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.completeOnboarding(true);
      if (res.user) {
        updateUser({ ...res.user, onboardingCompleted: true });
      } else {
        updateUser({ onboardingCompleted: true });
      }
    } catch {
      updateUser({ onboardingCompleted: true });
      setError(
        "Could not save dismiss status on the server. The banner is hidden for this session."
      );
    } finally {
      setLoading(false);
      void refreshUser();
    }
  }, [refreshUser, updateUser]);

  return {

    handleSkipOnboarding,

    handleCompleteOnboarding,

    handleGoToDashboard,

    handleDismissOnboarding,

    loading,

    error,

  };

}


