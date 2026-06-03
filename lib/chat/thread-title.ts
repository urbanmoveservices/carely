/** Deterministic thread title from first user message (no OpenAI call). */
export function generateThreadTitle(message: string): string {
  const cleaned = message
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\d{6,}/g, "[…]")
    .slice(0, 200);

  if (!cleaned) return "New chat";

  const sentence = cleaned.split(/[.!?।]\s/)[0] || cleaned;
  const words = sentence.split(/\s+/).filter(Boolean);
  let title = words.slice(0, 10).join(" ");
  if (title.length > 60) title = `${title.slice(0, 57).trim()}…`;
  else if (cleaned.length > title.length + 20) title = `${title}…`;

  return title || "New chat";
}
