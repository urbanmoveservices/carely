"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { BRAND } from "@/lib/brand";

export function OnboardingShell({
  children,
  step,
  total = 4,
}: {
  children: React.ReactNode;
  step: number;
  total?: number;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-blue-50">
      <header className="border-b border-gray-200/80 bg-white/90 backdrop-blur px-4 py-4">
        <Link href="/" className="inline-flex items-center gap-2">
          <BrandLogo size="sm" decorative />
          <span className="font-bold text-gray-900">{BRAND.name}</span>
        </Link>
        <div className="mt-3 flex gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${
                i < step ? "bg-brand-600" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-8">{children}</main>
    </div>
  );
}
