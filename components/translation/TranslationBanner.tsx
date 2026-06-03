"use client";



import { useAuth } from "@/components/AuthProvider";

import { useI18n } from "@/components/I18nProvider";

import { usePreferences } from "@/components/PreferencesProvider";

import { useTranslation } from "@/lib/i18n/use-translation";

import Link from "next/link";

import { Alert } from "@/components/ui/Alert";



export function TranslationBanner() {

  const { user } = useAuth();

  const { language, translationWarning } = useI18n();

  const prefs = usePreferences();

  const { t } = useTranslation();



  if (!user || language === "en") return null;



  const consentMsg = t(

    "common.translationConsent",

    "Enable AI translation in Settings to translate medical report content."

  );



  const needsConsent =

    !prefs.allowCloudTranslation &&

    (translationWarning?.includes("Settings") ||

      translationWarning?.includes("AI translation"));



  const unavailableMsg = t(

    "common.translationUnavailable",

    "Full translation is not available for this language yet."

  );



  const showUnavailable =

    translationWarning &&

    !needsConsent &&

    (translationWarning === unavailableMsg ||

      translationWarning.includes("not available") ||

      translationWarning.includes("not configured"));



  if (!needsConsent && !showUnavailable) return null;



  return (

    <div

      data-carely-no-translate

      data-toast-root

      className="fixed top-0 left-0 right-0 z-[60] px-3 pt-2 pointer-events-none"

    >

      <div className="mx-auto max-w-lg pointer-events-auto space-y-2">

        {needsConsent && (

          <Alert variant="warning" className="text-sm shadow-md">

            {consentMsg}{" "}

            <Link href="/settings" className="underline font-medium">

              Settings

            </Link>

          </Alert>

        )}

        {showUnavailable && (

          <Alert variant="warning" className="text-sm shadow-md">

            {unavailableMsg}

          </Alert>

        )}

      </div>

    </div>

  );

}

