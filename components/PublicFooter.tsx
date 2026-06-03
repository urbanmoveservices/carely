import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { BRAND } from "@/lib/brand";
import { COMPANY_NAME, PRODUCT_NAME } from "@/lib/company";

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/disclaimer", label: "Disclaimer" },
  { href: "/consent", label: "Consent" },
  { href: "/contact", label: "Contact" },
  { href: "/about", label: "About" },
  { href: "/help", label: "Help" },
] as const;

type PublicFooterProps = {
  compact?: boolean;
};

export function PublicFooter({ compact = false }: PublicFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div
        className={`mx-auto max-w-7xl px-4 text-center ${
          compact ? "py-5" : "py-8 sm:py-10"
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          <BrandLogo size="sm" decorative />
          <p className="text-sm font-semibold text-gray-900">{PRODUCT_NAME}</p>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Operated by {BRAND.operator}
        </p>
        <nav
          className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-2 ${
            compact ? "mt-3" : "mt-5"
          }`}
          aria-label="Legal and support"
        >
          {LEGAL_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-xs sm:text-sm text-brand-600 hover:text-brand-500 font-medium"
            >
              {label}
            </Link>
          ))}
        </nav>
        <p className="text-[11px] text-gray-400 mt-4">
          &copy; {year} {COMPANY_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
