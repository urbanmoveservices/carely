import type { ReactNode } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { PublicFooter } from "@/components/PublicFooter";
import { LegalLanguageBar } from "@/components/legal/LegalLanguageBar";
import {
  COMPANY_NAME,
  LEGAL_LAST_UPDATED,
  LEGAL_REVIEW_NOTE,
  PRODUCT_NAME,
} from "@/lib/company";

type LegalPageShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function LegalPageShell({
  title,
  subtitle,
  children,
}: LegalPageShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <BrandLogo size="md" decorative />
            <span className="font-bold text-gray-900 truncate text-sm sm:text-base">
              {PRODUCT_NAME}
            </span>
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-brand-600 hover:text-brand-500 shrink-0"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
        <p className="text-xs text-gray-500 mb-1">Operated by {COMPANY_NAME}</p>
        <LegalLanguageBar />
        <p className="text-xs text-gray-400 mb-4">Last updated: {LEGAL_LAST_UPDATED}</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        {subtitle && (
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">{subtitle}</p>
        )}
        <div className="prose-legal space-y-6 text-sm text-gray-700 leading-relaxed">
          {children}
        </div>
        <p className="mt-6 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
          Translated legal text is for convenience only. The English or legally
          reviewed version controls unless separately reviewed.
        </p>
        <p className="mt-4 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          {LEGAL_REVIEW_NOTE}
        </p>
        <nav
          className="mt-6 flex flex-wrap gap-3 text-sm"
          aria-label="Related legal pages"
        >
          <Link href="/privacy" className="text-brand-600 hover:underline">
            Privacy
          </Link>
          <Link href="/terms" className="text-brand-600 hover:underline">
            Terms
          </Link>
          <Link href="/disclaimer" className="text-brand-600 hover:underline">
            Disclaimer
          </Link>
          <Link href="/consent" className="text-brand-600 hover:underline">
            Consent
          </Link>
          <Link href="/contact" className="text-brand-600 hover:underline">
            Contact
          </Link>
          <Link href="/help" className="text-brand-600 hover:underline">
            Help
          </Link>
        </nav>
      </main>

      <PublicFooter />
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-base font-semibold text-gray-900 mb-2">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
