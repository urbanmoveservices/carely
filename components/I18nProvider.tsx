"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api-client";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  detectBrowserLanguage,
  isSupportedLanguage,
  type SupportedLanguageCode,
} from "@/lib/i18n/languages";
import { isRtlLanguage } from "@/lib/i18n/rtl";
import { translate, translateWithParams } from "@/lib/i18n/translations";
import { showToastOnce } from "@/lib/toast";
import { clearAllTranslationWarnings } from "@/lib/translation/warning-session";

export type SetLanguageOptions = {
  /** No success toast (init, preference sync from server) */
  silent?: boolean;
  /** Do not PATCH /api/preferences */
  skipPatch?: boolean;
};

export type I18nContextValue = {
  language: SupportedLanguageCode;
  setLanguage: (
    code: SupportedLanguageCode,
    options?: SetLanguageOptions
  ) => Promise<void>;
  t: (
    key: string,
    fallback?: string,
    vars?: Record<string, string | number>
  ) => string;
  /** @deprecated Use t(key, fallback, vars) */
  tParams: (
    key: string,
    params?: Record<string, string>,
    fallback?: string
  ) => string;
  supportedLanguages: typeof SUPPORTED_LANGUAGES;
  dir: "ltr" | "rtl";
  ready: boolean;
  translationVersion: number;
  isTranslating: boolean;
  setIsTranslating: (value: boolean) => void;
  translationWarning: string | null;
  setTranslationWarning: (value: string | null) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function readStoredLanguage(): SupportedLanguageCode {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored && isSupportedLanguage(stored)) return stored;
  return detectBrowserLanguage();
}

function applyDocumentLanguage(code: SupportedLanguageCode) {
  const dir = isRtlLanguage(code) ? "rtl" : "ltr";
  document.documentElement.lang = code;
  document.documentElement.dir = dir;
  document.body.dir = dir;
}

function dispatchLanguageChange(
  language: SupportedLanguageCode,
  version: number
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("carely-language-change", {
      detail: { language, translationVersion: version },
    })
  );
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<SupportedLanguageCode>(() =>
    typeof window !== "undefined" ? readStoredLanguage() : DEFAULT_LANGUAGE
  );
  const [ready, setReady] = useState(
    () => typeof window !== "undefined"
  );
  const [translationVersion, setTranslationVersion] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationWarning, setTranslationWarning] = useState<string | null>(
    null
  );

  const languageRef = useRef(language);
  const translationVersionRef = useRef(0);
  const hydratedRef = useRef(false);
  const prefsSyncedRef = useRef(false);
  const lastUserLangChangeRef = useRef(0);
  const patchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const patchSeqRef = useRef(0);

  languageRef.current = language;
  translationVersionRef.current = translationVersion;

  useEffect(() => {
    const initial = readStoredLanguage();
    languageRef.current = initial;
    setLanguageState(initial);
    applyDocumentLanguage(initial);
    hydratedRef.current = true;
    setReady(true);
  }, []);

  useEffect(() => {
    if (!user) {
      prefsSyncedRef.current = false;
      return;
    }
    if (prefsSyncedRef.current) return;

    api
      .getPreferences()
      .then((prefs) => {
        if (Date.now() - lastUserLangChangeRef.current < 5000) return;
        if (prefs.language && isSupportedLanguage(prefs.language)) {
          if (prefs.language !== languageRef.current) {
            languageRef.current = prefs.language;
            setLanguageState(prefs.language);
            localStorage.setItem(LANGUAGE_STORAGE_KEY, prefs.language);
            applyDocumentLanguage(prefs.language);
            const nextVersion = translationVersionRef.current + 1;
            translationVersionRef.current = nextVersion;
            setTranslationVersion(nextVersion);
            dispatchLanguageChange(prefs.language, nextVersion);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        prefsSyncedRef.current = true;
      });
  }, [user?.id]);

  const setLanguage = useCallback(
    async (code: SupportedLanguageCode, options?: SetLanguageOptions) => {
      if (!isSupportedLanguage(code)) return;
      if (code === languageRef.current) return;

      lastUserLangChangeRef.current = Date.now();
      languageRef.current = code;
      setLanguageState(code);
      localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
      applyDocumentLanguage(code);
      setTranslationWarning(null);
      clearAllTranslationWarnings();

      const nextVersion = translationVersionRef.current + 1;
      translationVersionRef.current = nextVersion;
      setTranslationVersion(nextVersion);
      dispatchLanguageChange(code, nextVersion);

      if (user && !options?.skipPatch) {
        const seq = ++patchSeqRef.current;
        if (patchTimerRef.current) clearTimeout(patchTimerRef.current);
        patchTimerRef.current = setTimeout(() => {
          void api
            .updatePreferences({ language: code })
            .catch(() => {
              if (patchSeqRef.current === seq) {
                showToastOnce(
                  translate(
                    code,
                    "common.translationError",
                    "Could not save language preference."
                  ),
                  "error"
                );
              }
            });
        }, 400);
      }

      if (!options?.silent && hydratedRef.current) {
        const msg = translate(
          code,
          "common.languageUpdated",
          "Language updated"
        );
        showToastOnce(msg, "success");
      }
    },
    [user]
  );

  const t = useCallback(
    (
      key: string,
      fallback?: string,
      vars?: Record<string, string | number>
    ) => {
      if (vars && Object.keys(vars).length > 0) {
        return translateWithParams(language, key, vars, fallback);
      }
      return translate(language, key, fallback);
    },
    [language]
  );

  const tParams = useCallback(
    (
      key: string,
      params?: Record<string, string>,
      fallback?: string
    ) => translateWithParams(language, key, params, fallback),
    [language]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t,
      tParams,
      supportedLanguages: SUPPORTED_LANGUAGES,
      dir: isRtlLanguage(language) ? "rtl" : "ltr",
      ready,
      translationVersion,
      isTranslating,
      setIsTranslating,
      translationWarning,
      setTranslationWarning,
    }),
    [
      language,
      setLanguage,
      t,
      tParams,
      ready,
      translationVersion,
      isTranslating,
      translationWarning,
    ]
  );

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
