"use client";

import { useTranslation } from "@/lib/i18n/use-translation";

export function LandingPlans() {
  const { t } = useTranslation();
  const plans = [
    { name: t("billing.free"), price: "₹0/mo", detail: "3 uploads · 1 summary" },
    { name: t("billing.pro"), price: "₹9/mo", detail: "50 uploads · 50 AI summaries" },
    { name: t("billing.family"), price: "₹249/mo", detail: "500 uploads · caregiver sharing" },
  ];

  return (
    <section className="py-14 sm:py-20 bg-white border-t border-gray-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {t("billing.currentPlan")}
          </h2>
          <p className="mt-2 text-sm text-gray-500">{t("billing.upgrade")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3 max-w-3xl mx-auto">
          {plans.map((p) => (
            <div
              key={p.name}
              className="rounded-2xl border border-gray-100 bg-gray-50/80 p-5 text-center"
            >
              <p className="font-bold text-gray-900">{p.name}</p>
              <p className="text-brand-700 font-semibold mt-1">{p.price}</p>
              <p className="text-xs text-gray-500 mt-2">{p.detail}</p>
            </div>
          ))}
        </div>
        <p className="text-center mt-6">
          <a href="/pricing" className="text-brand-600 font-medium hover:underline">
            {t("common.viewAll")} →
          </a>
        </p>
      </div>
    </section>
  );
}
