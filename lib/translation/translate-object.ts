import {
  shouldSkipObjectKey,
  shouldSkipTextTranslation,
} from "./should-translate";
import { translateBatchWithCache } from "./service";
import type { TranslationContext } from "./openai-translation-provider";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export async function translateObject<T = JsonValue>(params: {
  data: T;
  targetLanguage: string;
  sourceLanguage?: string;
  allowCloud?: boolean;
  context?: TranslationContext;
}): Promise<T> {
  const {
    data,
    targetLanguage,
    sourceLanguage = "en",
    allowCloud = true,
    context = "medical_report",
  } = params;

  if (targetLanguage === "en") return data;

  const strings: string[] = [];
  const paths: string[] = [];

  function collect(value: JsonValue, path: string) {
    if (
      value === null ||
      typeof value === "boolean" ||
      typeof value === "number"
    ) {
      return;
    }
    if (typeof value === "string") {
      if (shouldSkipTextTranslation(value)) return;
      strings.push(value);
      paths.push(path);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, i) => collect(item, `${path}[${i}]`));
      return;
    }
    if (typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        if (shouldSkipObjectKey(key)) continue;
        collect(child as JsonValue, path ? `${path}.${key}` : key);
      }
    }
  }

  collect(data as JsonValue, "");

  if (strings.length === 0) return data;

  const translated = await translateBatchWithCache({
    texts: strings,
    targetLanguage,
    sourceLanguage,
    allowCloud,
    context,
  });

  const map = new Map<string, string>();
  strings.forEach((s, i) => map.set(s, translated.texts[i] ?? s));

  function apply(value: JsonValue, key?: string): JsonValue {
    if (
      value === null ||
      typeof value === "boolean" ||
      typeof value === "number"
    ) {
      return value;
    }
    if (typeof value === "string") {
      if (key && shouldSkipObjectKey(key)) return value;
      if (shouldSkipTextTranslation(value)) return value;
      return map.get(value) ?? value;
    }
    if (Array.isArray(value)) {
      return value.map((item) => apply(item));
    }
    if (typeof value === "object") {
      const out: Record<string, JsonValue> = {};
      for (const [k, child] of Object.entries(value)) {
        if (shouldSkipObjectKey(k)) {
          out[k] = child as JsonValue;
        } else {
          out[k] = apply(child as JsonValue, k);
        }
      }
      return out;
    }
    return value;
  }

  return apply(data as JsonValue) as T;
}
