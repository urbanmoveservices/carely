import type { TranslationProvider } from "./provider";
import { PHRASE_MAP_HI } from "@/lib/i18n/mock-report-translations";

const UNSUPPORTED_MSG =
  "Full translation is not available for this language yet.";

function mapMockPhrase(text: string, targetLanguage: string): string {
  if (targetLanguage === "hi") {
    return PHRASE_MAP_HI[text] ?? text;
  }
  return text;
}

export class MockTranslationProvider implements TranslationProvider {
  readonly name = "mock";
  readonly isCloud = false;

  async translateText(params: {
    text: string;
    targetLanguage: string;
    sourceLanguage?: string;
  }): Promise<string> {
    const { text, targetLanguage } = params;
    if (targetLanguage === "en") return text;
    if (targetLanguage === "hi") return mapMockPhrase(text, "hi");
    return text;
  }

  async translateBatch(params: {
    texts: string[];
    targetLanguage: string;
    sourceLanguage?: string;
  }): Promise<string[]> {
    const { texts, targetLanguage } = params;
    if (targetLanguage === "en") return texts;
    return texts.map((t) => mapMockPhrase(t, targetLanguage));
  }

  static unsupportedNotice(targetLanguage: string): string | undefined {
    if (targetLanguage === "en" || targetLanguage === "hi") return undefined;
    return UNSUPPORTED_MSG;
  }
}
