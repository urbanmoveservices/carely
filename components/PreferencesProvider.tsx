"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./AuthProvider";
import { api } from "@/lib/api-client";
import type { UserPreference } from "@/types";

const defaultPref: UserPreference = {
  seniorMode: false,
  language: "en",
  fontScale: "normal",
  highContrast: false,
  reduceMotion: false,
  allowCloudTranslation: false,
};

type PreferencesContextValue = {
  prefs: UserPreference;
  refreshPreferences: () => Promise<void>;
};

const PreferencesContext = createContext<PreferencesContextValue>({
  prefs: defaultPref,
  refreshPreferences: async () => {},
});

export function usePreferences(): UserPreference {
  return useContext(PreferencesContext).prefs;
}

export function usePreferencesActions() {
  return useContext(PreferencesContext);
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<UserPreference>(defaultPref);

  const refreshPreferences = useCallback(async () => {
    if (!user) return;
    try {
      const next = await api.getPreferences();
      setPrefs(next);
    } catch {
      setPrefs(defaultPref);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      document.documentElement.classList.remove(
        "senior-mode",
        "font-large",
        "font-extra-large",
        "high-contrast",
        "reduce-motion"
      );
      setPrefs(defaultPref);
      return;
    }
    void refreshPreferences();
  }, [user, refreshPreferences]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("senior-mode", prefs.seniorMode);
    root.classList.toggle("font-large", prefs.fontScale === "large");
    root.classList.toggle("font-extra-large", prefs.fontScale === "extra_large");
    root.classList.toggle("high-contrast", prefs.highContrast);
    root.classList.toggle("reduce-motion", prefs.reduceMotion);
  }, [prefs]);

  return (
    <PreferencesContext.Provider value={{ prefs, refreshPreferences }}>
      {children}
    </PreferencesContext.Provider>
  );
}
