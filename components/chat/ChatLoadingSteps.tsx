"use client";

import { useTranslation } from "@/lib/i18n/use-translation";

export function ChatLoadingSteps({ activeStep }: { activeStep: number }) {
  const { t } = useTranslation();
  const steps = [t("chat.loadingStep1"), t("chat.loadingStep2"), t("chat.loadingStep3")];

  return (
    <div className="py-3 space-y-2" role="status" aria-live="polite">
      {steps.map((label, i) => {
        const done = i < activeStep;
        const current = i === activeStep;
        return (
          <div
            key={label}
            className={`flex items-center gap-2 text-sm ${
              current ? "text-brand-700 font-medium" : done ? "text-gray-500" : "text-gray-400"
            }`}
          >
            <span
              className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                done
                  ? "bg-brand-100 text-brand-700"
                  : current
                    ? "bg-brand-500 text-white animate-pulse"
                    : "bg-gray-100 text-gray-400"
              }`}
              aria-hidden
            >
              {done ? "✓" : i + 1}
            </span>
            {label}
            {current && <span className="sr-only"> — in progress</span>}
          </div>
        );
      })}
    </div>
  );
}
