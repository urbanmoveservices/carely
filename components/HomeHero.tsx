"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { Button } from "./ui/Button";
import { TryDemoButton } from "./TryDemoButton";
import { ArrowRight, Upload } from "lucide-react";
import { useTranslation } from "@/lib/i18n/use-translation";

export function HomeHero() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const primaryHref = user ? "/dashboard" : "/signup";
  const primaryLabel = user ? t("landing.ctaDashboard") : t("landing.ctaStart");
  const uploadHref = user ? "/upload" : "/signup";

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-blue-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center py-16 sm:py-24 lg:py-28 lg:flex-row lg:text-left lg:items-start lg:gap-16">
          {/* Text column */}
          <div className="flex-1 max-w-xl lg:max-w-none">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-100/80 px-4 py-1.5 text-xs sm:text-sm font-medium text-brand-700 mb-5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
              </span>
              {t("landing.badge")}
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight">
              {t("landing.headline")}
            </h1>

            <p className="mt-4 sm:mt-5 text-base sm:text-lg text-gray-600 leading-relaxed max-w-lg mx-auto lg:mx-0">
              {t("landing.subheadline")}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4">
              <Link href={primaryHref} className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto">
                  {primaryLabel}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              {!user && <TryDemoButton className="w-full sm:w-auto" />}
              <Link href={uploadHref} className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  <Upload className="h-5 w-5" />
                  {t("landing.ctaUpload")}
                </Button>
              </Link>
            </div>
          </div>

          {/* Visual column — CSS-only card cluster */}
          <div className="hidden lg:flex flex-1 items-center justify-center">
            <div className="relative w-72 h-72">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-brand-200/50 to-blue-200/50 blur-2xl" />
              <div className="relative z-10 rounded-2xl border border-brand-200/60 bg-white/80 backdrop-blur p-6 shadow-lg w-full h-full flex flex-col items-center justify-center gap-3">
                <div className="rounded-full bg-brand-100 p-4">
                  <svg className="h-10 w-10 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-800">{t("landing.visualTitle")}</p>
                <p className="text-xs text-gray-500 text-center leading-relaxed">
                  {t("landing.visualSubtitle")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
