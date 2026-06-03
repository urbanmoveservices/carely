export type ToastVariant = "success" | "error" | "info";

export type ToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type Listener = (items: ToastItem[]) => void;

let items: ToastItem[] = [];
let nextId = 0;
const listeners = new Set<Listener>();

const lastShown = { message: "", at: 0 };

function notify() {
  const snapshot = [...items];
  listeners.forEach((fn) => fn(snapshot));
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener([...items]);
  return () => listeners.delete(listener);
}

export function showToast(
  message: string,
  variant: ToastVariant = "success",
  durationMs = 2800
) {
  const id = ++nextId;
  items = [...items, { id, message, variant }];
  notify();

  window.setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    notify();
  }, durationMs);
}

/** Dedupe identical messages within 2s (prevents language-switch spam) */
export function showToastOnce(
  message: string,
  variant: ToastVariant = "success"
) {
  const now = Date.now();
  if (message === lastShown.message && now - lastShown.at < 2000) return;
  lastShown.message = message;
  lastShown.at = now;
  showToast(message, variant);
}
