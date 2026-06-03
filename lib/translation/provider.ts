import type { TranslationContext } from "./openai-translation-provider";
import {
  isOpenAiTranslationConfigured,
  translateBatchWithOpenAI,
  translateTextWithOpenAI,
} from "./openai-translation-provider";
import { MockTranslationProvider } from "./mock-provider";

export interface TranslationProvider {
  readonly name: string;
  readonly isCloud: boolean;

  translateText(params: {
    text: string;
    targetLanguage: string;
    sourceLanguage?: string;
  }): Promise<string>;

  translateBatch(params: {
    texts: string[];
    targetLanguage: string;
    sourceLanguage?: string;
  }): Promise<string[]>;
}

class OpenAiTranslationProvider implements TranslationProvider {
  readonly name = "openai";
  readonly isCloud = true;

  constructor(readonly context: TranslationContext = "general") {}

  translateText(params: {
    text: string;
    targetLanguage: string;
    sourceLanguage?: string;
  }): Promise<string> {
    return translateTextWithOpenAI({ ...params, context: this.context });
  }

  translateBatch(params: {
    texts: string[];
    targetLanguage: string;
    sourceLanguage?: string;
  }): Promise<string[]> {
    return translateBatchWithOpenAI({ ...params, context: this.context });
  }
}

export type ActiveProviderInfo = {
  provider: TranslationProvider;
  name: "openai" | "mock";
  isCloud: boolean;
};

let cachedProviders = new Map<string, ActiveProviderInfo>();

function cacheKey(context: TranslationContext): string {
  return isOpenAiTranslationConfigured() ? `openai:${context}` : "mock";
}

export function getActiveTranslationProvider(
  context: TranslationContext = "general"
): ActiveProviderInfo {
  const key = cacheKey(context);
  const hit = cachedProviders.get(key);
  if (hit) return hit;

  if (isOpenAiTranslationConfigured()) {
    const info: ActiveProviderInfo = {
      provider: new OpenAiTranslationProvider(context),
      name: "openai",
      isCloud: true,
    };
    cachedProviders.set(key, info);
    return info;
  }

  const info: ActiveProviderInfo = {
    provider: new MockTranslationProvider(),
    name: "mock",
    isCloud: false,
  };
  cachedProviders.set(key, info);
  return info;
}

export function resetProviderCacheForTests() {
  cachedProviders = new Map();
}

export function isCloudTranslationProvider(): boolean {
  return getActiveTranslationProvider().isCloud;
}
