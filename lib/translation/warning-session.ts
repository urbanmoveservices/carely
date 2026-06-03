/** One warning per language+message per browser session (avoids toast/banner spam) */
const shownWarnings = new Set<string>();

export function shouldShowTranslationWarning(
  language: string,
  message: string
): boolean {
  const key = `${language}::${message}`;
  if (shownWarnings.has(key)) return false;
  shownWarnings.add(key);
  return true;
}

export function resetTranslationWarningsForLanguage(language: string): void {
  for (const key of shownWarnings) {
    if (key.startsWith(`${language}::`)) shownWarnings.delete(key);
  }
}

export function clearAllTranslationWarnings(): void {
  shownWarnings.clear();
}
