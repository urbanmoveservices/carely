"use client";

import { FeatureCard } from "@/components/FeatureCard";
import { useTranslation } from "@/lib/i18n/use-translation";
import {
  FileText,
  Brain,
  Apple,
  Dumbbell,
  BarChart3,
  Download,
  Upload,
  Sparkles,
  Eye,
  Shield,
  Lock,
  UserCheck,
  AlertTriangle,
  Heart,
  Activity,
  Stethoscope,
} from "lucide-react";

export function LandingFeatures() {
  const { t } = useTranslation();
  const features = [
    {
      icon: Brain,
      title: t("landing.feature1Title"),
      description: t("landing.feature1Desc"),
    },
    {
      icon: Eye,
      title: t("landing.feature2Title"),
      description: t("landing.feature2Desc"),
    },
    {
      icon: Apple,
      title: t("landing.feature3Title"),
      description: t("landing.feature3Desc"),
    },
    {
      icon: Dumbbell,
      title: t("landing.feature4Title"),
      description: t("landing.feature4Desc"),
    },
    {
      icon: BarChart3,
      title: t("landing.feature5Title"),
      description: t("landing.feature5Desc"),
    },
    {
      icon: Download,
      title: t("landing.feature6Title"),
      description: t("landing.feature6Desc"),
    },
  ];

  return (
    <section id="features" className="py-14 sm:py-20 bg-gray-50 scroll-mt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {t("landing.featuresTitle")}
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingHowItWorks() {
  const { t } = useTranslation();
  const steps = [
    {
      icon: Upload,
      step: "1",
      title: t("landing.step1Title"),
      description: t("landing.step1Desc"),
    },
    {
      icon: Sparkles,
      step: "2",
      title: t("landing.step2Title"),
      description: t("landing.step2Desc"),
    },
    {
      icon: Eye,
      step: "3",
      title: t("landing.step3Title"),
      description: t("landing.step3Desc"),
    },
  ];

  return (
    <section id="how-it-works" className="py-14 sm:py-20 bg-white scroll-mt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {t("landing.howItWorksTitle")}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-gray-500">
            {t("landing.howItWorksSubtitle")}
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.step} className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100">
                <s.icon className="h-7 w-7 text-brand-600" />
              </div>
              <span className="text-xs font-bold text-brand-600">STEP {s.step}</span>
              <h3 className="mt-2 text-lg font-semibold text-gray-900">{s.title}</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingDisclaimer() {
  const { t } = useTranslation();
  const text = t("landing.disclaimerShort");
  if (!text.trim()) return null;
  return (
    <section className="py-10 bg-amber-50 border-y border-amber-100">
      <div className="mx-auto max-w-3xl px-4 text-center">
        <AlertTriangle className="h-6 w-6 text-amber-600 mx-auto mb-3" />
        <p className="text-sm text-amber-900 leading-relaxed">{text}</p>
      </div>
    </section>
  );
}

export function LandingTrust() {
  const { t } = useTranslation();
  const useCases = [
    {
      icon: Stethoscope,
      title: t("landing.useCase1Title"),
      desc: t("landing.useCase1Desc"),
    },
    {
      icon: Activity,
      title: t("landing.useCase2Title"),
      desc: t("landing.useCase2Desc"),
    },
    {
      icon: Heart,
      title: t("landing.useCase3Title"),
      desc: t("landing.useCase3Desc"),
    },
  ];

  return (
    <section className="py-14 sm:py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-10">
          {t("landing.useCasesTitle")}
        </h2>
        <div className="grid gap-6 sm:grid-cols-3 mb-12">
          {useCases.map((u) => (
            <div
              key={u.title}
              className="rounded-2xl border border-gray-100 p-5 text-center"
            >
              <u.icon className="h-8 w-8 text-brand-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900">{u.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{u.desc}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
          <span className="inline-flex items-center gap-2">
            <Shield className="h-4 w-4 text-brand-600" /> Secure uploads
          </span>
          <span className="inline-flex items-center gap-2">
            <Lock className="h-4 w-4 text-brand-600" /> Private by default
          </span>
          <span className="inline-flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-brand-600" /> Family sharing
          </span>
        </div>
      </div>
    </section>
  );
}

export function LandingFooterNote() {
  const { t } = useTranslation();
  const text = t("landing.disclaimerShort");
  if (!text.trim()) return null;
  return (
    <section className="py-8 bg-gray-50 text-center px-4">
      <FileText className="h-6 w-6 text-gray-400 mx-auto mb-2" />
      <p className="text-xs text-gray-500 max-w-lg mx-auto">{text}</p>
    </section>
  );
}
