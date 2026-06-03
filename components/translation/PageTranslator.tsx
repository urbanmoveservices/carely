"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/components/I18nProvider";
import { api } from "@/lib/api-client";
import { shouldSkipTextNode } from "@/lib/translation/skip-nodes";
import {
  shouldShowTranslationWarning,
  resetTranslationWarningsForLanguage,
} from "@/lib/translation/warning-session";
import type { TranslationContext } from "@/lib/translation/openai-translation-provider";

const DEBOUNCE_MS = 700;
const BATCH_SIZE = 50;
const ROOT_ID = "carely-app-content";

const LEGAL_PATHS = new Set([
  "/terms",
  "/privacy",
  "/disclaimer",
  "/consent",
  "/contact",
  "/help",
  "/about",
]);

const clientTranslationCache = new Map<string, string>();

function clientCacheKey(language: string, text: string): string {
  return `${language}\u0000${text}`;
}

function getPageTranslationContext(pathname: string): TranslationContext {
  if (LEGAL_PATHS.has(pathname)) return "legal";
  return "ui";
}

function collectTextNodes(root: HTMLElement, targetLang: string): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const textNode = node as Text;
      if (shouldSkipTextNode(textNode)) return NodeFilter.FILTER_REJECT;

      const parent = textNode.parentElement;
      if (parent?.closest('[data-translation-managed="report"]')) {
        return NodeFilter.FILTER_REJECT;
      }

      const markedLang = parent?.getAttribute("data-carely-translated-lang");
      if (markedLang === targetLang) return NodeFilter.FILTER_REJECT;

      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let current = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }
  return nodes;
}

function clearTranslatedMarkers(root: HTMLElement) {
  root.querySelectorAll("[data-carely-translated-lang]").forEach((el) => {
    el.removeAttribute("data-carely-translated-lang");
  });
}

export function PageTranslator() {
  const { user } = useAuth();
  const {
    language,
    ready,
    translationVersion,
    setTranslationWarning,
    setIsTranslating,
  } = useI18n();
  const pathname = usePathname();

  const modifiedRef = useRef(new Set<Text>());
  const originalsRef = useRef(new WeakMap<Text, string>());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runningRef = useRef(false);
  const isApplyingRef = useRef(false);
  const languageRef = useRef(language);
  const versionRef = useRef(translationVersion);

  languageRef.current = language;
  versionRef.current = translationVersion;

  const restoreOriginals = useCallback(() => {
    modifiedRef.current.forEach((node) => {
      const original = originalsRef.current.get(node);
      if (original !== undefined) node.textContent = original;
      node.parentElement?.removeAttribute("data-carely-translated-lang");
    });
    modifiedRef.current.clear();
  }, []);

  const runTranslation = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!user || !ready) return;
    if (isApplyingRef.current || runningRef.current) return;

    const root = document.getElementById(ROOT_ID);
    if (!root) return;

    const lang = languageRef.current;

    if (lang === "en") {
      restoreOriginals();
      clearTranslatedMarkers(root);
      setTranslationWarning(null);
      setIsTranslating(false);
      return;
    }

    runningRef.current = true;
    setIsTranslating(true);

    try {
      const textNodes = collectTextNodes(root, lang);
      const unique = new Map<string, Text[]>();

      for (const node of textNodes) {
        const raw = node.textContent ?? "";
        const trimmed = raw.trim();
        if (!trimmed) continue;

        if (!originalsRef.current.has(node)) {
          originalsRef.current.set(node, raw);
        }

        const list = unique.get(trimmed) ?? [];
        list.push(node);
        unique.set(trimmed, list);
      }

      const context = getPageTranslationContext(pathname);
      const strings = Array.from(unique.keys());
      if (strings.length === 0) return;

      const allTranslations: string[] = [];
      let warning: string | undefined;

      for (let i = 0; i < strings.length; i += BATCH_SIZE) {
        const chunk = strings.slice(i, i + BATCH_SIZE);
        const chunkResults: string[] = new Array(chunk.length);
        const uncached: string[] = [];
        const uncachedIndices: number[] = [];

        chunk.forEach((s, idx) => {
          const hit = clientTranslationCache.get(clientCacheKey(lang, s));
          if (hit !== undefined) {
            chunkResults[idx] = hit;
          } else {
            uncached.push(s);
            uncachedIndices.push(idx);
          }
        });

        if (uncached.length > 0) {
          try {
            const res = await api.translateBatch({
              texts: uncached,
              targetLanguage: lang,
              sourceLanguage: "en",
              context,
            });
            uncachedIndices.forEach((origIdx, j) => {
              const source = uncached[j];
              const translated = res.translations[j] ?? source;
              clientTranslationCache.set(
                clientCacheKey(lang, source),
                translated
              );
              chunkResults[origIdx] = translated;
            });
            if (res.warning) warning = res.warning;
          } catch (err: unknown) {
            const e = err as Error & { code?: string };
            if (e.code === "TRANSLATION_NOT_CONFIGURED") {
              console.warn("Page translation: OpenAI not configured");
              return;
            }
            console.warn("Page translation batch failed:", err);
            return;
          }
        }

        allTranslations.push(...chunkResults);
      }

      if (allTranslations.length !== strings.length) return;

      isApplyingRef.current = true;
      try {
        strings.forEach((source, idx) => {
          const translated = allTranslations[idx] ?? source;
          if (translated === source) return;
          const targets = unique.get(source) ?? [];
          for (const node of targets) {
            const original =
              originalsRef.current.get(node) ?? node.textContent ?? "";
            const leading = original.match(/^\s*/)?.[0] ?? "";
            const trailing = original.match(/\s*$/)?.[0] ?? "";
            node.textContent = leading + translated + trailing;
            node.parentElement?.setAttribute(
              "data-carely-translated-lang",
              lang
            );
            modifiedRef.current.add(node);
          }
        });
      } finally {
        isApplyingRef.current = false;
      }

      if (warning) {
        if (shouldShowTranslationWarning(lang, warning)) {
          setTranslationWarning(warning);
        }
      } else {
        setTranslationWarning(null);
      }
    } finally {
      runningRef.current = false;
      setIsTranslating(false);
    }
  }, [
    user,
    ready,
    pathname,
    restoreOriginals,
    setTranslationWarning,
    setIsTranslating,
  ]);

  const rerunForCurrentPage = useCallback(() => {
    const root = document.getElementById(ROOT_ID);
    if (root) {
      restoreOriginals();
      clearTranslatedMarkers(root);
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void runTranslation();
    }, DEBOUNCE_MS);
  }, [restoreOriginals, runTranslation]);

  useEffect(() => {
    resetTranslationWarningsForLanguage(language);
    rerunForCurrentPage();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [language, translationVersion, pathname, user?.id, ready, rerunForCurrentPage]);

  useEffect(() => {
    const root = document.getElementById(ROOT_ID);
    if (!root || language === "en" || !user) return;

    const observer = new MutationObserver(() => {
      if (isApplyingRef.current || runningRef.current) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void runTranslation();
      }, DEBOUNCE_MS);
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [language, user?.id, runTranslation]);

  useEffect(() => {
    const onLangEvent = () => rerunForCurrentPage();
    window.addEventListener("carely-language-change", onLangEvent);
    return () =>
      window.removeEventListener("carely-language-change", onLangEvent);
  }, [rerunForCurrentPage]);

  return null;
}
