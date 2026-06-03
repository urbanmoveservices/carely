"use client";

import { useEffect, useState } from "react";
import { subscribeToasts, type ToastItem } from "@/lib/toast";
import { cn } from "@/lib/utils";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setToasts), []);

  return (
    <>
      {children}
      <div
        data-toast-root
        data-carely-no-translate
        aria-live="polite"
        className="fixed bottom-20 sm:bottom-6 right-4 z-[100] flex flex-col gap-2 pointer-events-none max-w-sm"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto rounded-xl px-4 py-2.5 text-sm shadow-lg border",
              t.variant === "success" &&
                "bg-white border-green-200 text-green-900",
              t.variant === "error" &&
                "bg-white border-red-200 text-red-900",
              t.variant === "info" && "bg-white border-gray-200 text-gray-900"
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </>
  );
}
