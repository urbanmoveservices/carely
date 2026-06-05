import { snippetMaxChars } from "@/lib/ai/model-router";

/** Pick lines from raw OCR text that mention lab-related keywords. */
export function selectRelevantSnippets(
  extractedText: string,
  keywords: string[],
  maxChars = snippetMaxChars()
): string {
  if (!extractedText?.trim()) return "";
  const lowerKeys = keywords.map((k) => k.toLowerCase()).filter(Boolean);
  if (!lowerKeys.length) {
    return extractedText.slice(0, maxChars);
  }

  const lines = extractedText.split(/\r?\n/);
  const matched: string[] = [];
  let len = 0;

  for (const line of lines) {
    const l = line.trim();
    if (l.length < 4) continue;
    const ll = l.toLowerCase();
    if (lowerKeys.some((k) => ll.includes(k))) {
      if (len + l.length > maxChars) break;
      matched.push(l);
      len += l.length;
    }
  }

  if (matched.length === 0) {
    return extractedText.slice(0, maxChars);
  }
  return matched.join("\n");
}
