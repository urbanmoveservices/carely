"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import { AppHeader } from "@/components/AppHeader";
import { MobileShell } from "@/components/MobileShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useTranslation } from "@/lib/i18n/use-translation";
import {
  Search,
  Lightbulb,
  ShieldAlert,
  FlaskConical,
  NotebookPen,
  Share2,
  Settings,
  HeartHandshake,
  Shield,
  CreditCard,
  HelpCircle,
  MessageCircle,
  Mail,
  Info,
  FileText,
} from "lucide-react";

const MORE_ITEMS = [
  { href: "/chat", labelKey: "nav.chat", fallback: "Chat", subtitleFallback: "Ask Vaidya GPT anything", icon: MessageCircle },
  { href: "/search", labelKey: "nav.search", fallback: "Search", subtitleFallback: "Find reports & health data", icon: Search },
  { href: "/insights", labelKey: "nav.insights", fallback: "Insights", subtitleFallback: "Smart health reminders", icon: Lightbulb },
  { href: "/health-risks", labelKey: "nav.healthRisks", fallback: "Health Risks", subtitleFallback: "Risk cards from your data", icon: ShieldAlert },
  { href: "/lab-tests", labelKey: "nav.labTests", fallback: "Lab Tests", subtitleFallback: "Reference ranges library", icon: FlaskConical },
  { href: "/symptoms", labelKey: "nav.symptoms", fallback: "Symptom Journal", subtitleFallback: "Track symptoms over time", icon: NotebookPen },
  { href: "/sharing", labelKey: "nav.sharing", fallback: "Family Sharing", subtitleFallback: "Invite caregivers", icon: Share2 },
  { href: "/caregiver", labelKey: "nav.caregiver", fallback: "Caregiver View", subtitleFallback: "Shared with you", icon: HeartHandshake },
  { href: "/billing", labelKey: "nav.billing", fallback: "Plan & Billing", subtitleFallback: "Usage and Razorpay upgrades", icon: CreditCard },
  { href: "/settings", labelKey: "nav.settings", fallback: "Settings", subtitleFallback: "Profile & accessibility", icon: Settings },
  { href: "/health-chat", labelKey: "nav.healthChat", fallback: "Health Chat", subtitleFallback: "Ask about family health data", icon: MessageCircle },
  { href: "/help", labelKey: "nav.help", fallback: "Help", subtitleFallback: "FAQs and troubleshooting", icon: HelpCircle },
  { href: "/help/chat", labelKey: "nav.helpChat", fallback: "Support Chat", subtitleFallback: "App usage & billing help", icon: MessageCircle },
  { href: "/contact", labelKey: "nav.contact", fallback: "Contact", subtitleFallback: "Support & legal inquiries", icon: Mail },
  { href: "/about", labelKey: "nav.about", fallback: "About", subtitleFallback: "Product & operator info", icon: Info },
  { href: "/privacy", labelKey: "common.privacy", fallback: "Privacy", subtitleFallback: "Privacy policy", icon: FileText },
  { href: "/terms", labelKey: "common.terms", fallback: "Terms", subtitleFallback: "Terms of use", icon: FileText },
] as const;

export default function MorePage() {
  return (
    <ProtectedRoute>
      <MoreContent />
    </ProtectedRoute>
  );
}

function MoreContent() {
  const { user } = useAuth();
  const { t, language, translationVersion } = useTranslation();

  const items = useMemo(
    () =>
      MORE_ITEMS.map((item) => ({
        ...item,
        label: t(item.labelKey, item.fallback),
        subtitle: t(`${item.labelKey}.sub`, item.subtitleFallback),
      })),
    [t, language, translationVersion]
  );

  return (
    <MobileShell>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">
          {t("nav.more", "More")}
        </h1>
        <p className="text-sm text-gray-500 mb-5">
          {t("more.subtitle", "Tools, insights, and account settings")}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map(({ href, label, subtitle, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-start gap-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm active:bg-gray-50 min-h-[108px] transition-colors"
            >
              <span className="rounded-xl bg-brand-50 p-2">
                <Icon className="h-5 w-5 text-brand-600" aria-hidden />
              </span>
              <span className="text-sm font-semibold text-gray-900 leading-tight">
                {label}
              </span>
              <span className="text-[11px] text-gray-500 leading-snug line-clamp-2">
                {subtitle}
              </span>
            </Link>
          ))}
          {user?.role === "admin" && (
            <Link
              href="/admin"
              className="flex flex-col items-start gap-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm active:bg-gray-50 min-h-[108px]"
            >
              <span className="rounded-xl bg-gray-100 p-2">
                <Shield className="h-5 w-5 text-gray-700" aria-hidden />
              </span>
              <span className="text-sm font-semibold text-gray-900 leading-tight">
                {t("common.admin", "Admin Panel")}
              </span>
              <span className="text-[11px] text-gray-500 leading-snug">
                {t("more.adminSub", "Manage users & content")}
              </span>
            </Link>
          )}
        </div>
      </main>
    </MobileShell>
  );
}
