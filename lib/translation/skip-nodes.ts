import { shouldSkipTextTranslation } from "./sanitize";

const TOAST_SKIP_SELECTORS = [
  "[data-toast-root]",
  "[data-carely-no-translate]",
  "[data-sonner-toaster]",
  "[data-sonner-toast]",
  "[role='status']",
  "[role='alert']",
  "[aria-live]",
  ".toast",
  ".toaster",
  ".sonner-toast",
  ".Toastify",
];

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "SVG",
  "CODE",
  "PRE",
  "INPUT",
  "TEXTAREA",
  "SELECT",
  "OPTION",
]);

/** True if element or any ancestor should be excluded from DOM translation */
export function shouldSkipElement(el: Element | null): boolean {
  if (!el) return true;
  if (el.hasAttribute("data-carely-no-translate")) return true;
  if (el.hasAttribute("data-no-translate")) return true;
  if (el.hasAttribute("data-toast-root")) return true;
  if (el.hasAttribute("data-carely-skip-translate")) return true;
  if (el.closest('[data-translation-managed="report"]')) return true;
  if (el.closest("[contenteditable='true']")) return true;

  for (const sel of TOAST_SKIP_SELECTORS) {
    if (el.matches(sel) || el.closest(sel)) return true;
  }

  const tag = el.tagName;
  if (SKIP_TAGS.has(tag)) return true;
  if (el.closest("input, textarea, select")) return true;

  return false;
}

export function shouldSkipTextNode(node: Text): boolean {
  const parent = node.parentElement;
  if (!parent || shouldSkipElement(parent)) return true;

  const text = node.textContent ?? "";
  if (!text.trim() || shouldSkipTextTranslation(text)) return true;

  return false;
}
