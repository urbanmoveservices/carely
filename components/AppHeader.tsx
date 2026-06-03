"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { MobileMenu } from "./MobileMenu";
import { ProfileMenu } from "./ProfileMenu";
import { Button } from "./ui/Button";
import {
  APP_DESKTOP_LINKS,
  LANDING_PUBLIC_LINKS,
  isLandingPage,
} from "@/lib/header-nav";
import { Menu } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "@/lib/i18n/use-translation";
import { LanguageSelector } from "@/components/LanguageSelector";
import { NotificationBadgeLink } from "@/components/dashboard/NotificationBadge";
import { ROUTE_LABEL_KEYS } from "@/lib/i18n/nav-keys";
import { BrandLogo } from "@/components/BrandLogo";
import { BRAND } from "@/lib/brand";

function Logo() {
  return (
    <>
      <BrandLogo size="md" decorative />
      <span className="truncate text-sm sm:text-lg font-bold text-gray-900">
        <span className="sm:hidden">{BRAND.shortName}</span>
        <span className="hidden sm:inline">{BRAND.name}</span>
      </span>
    </>
  );
}

export function AppHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isLanding = isLandingPage(pathname);
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    router.replace("/login");
  };

  const logoHref = user ? "/dashboard" : "/";

  const showMobileMenuButton = isLanding || !!user;

  const appLinks = APP_DESKTOP_LINKS.filter(
    (l) => !l.adminOnly || user?.role === "admin"
  );

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/90 backdrop-blur-lg supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex h-14 min-h-[56px] sm:h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
          <Link
            href={logoHref}
            className="flex min-w-0 items-center gap-2.5 shrink"
          >
            <Logo />
          </Link>

          {/* Desktop navigation */}
          <nav
            className="hidden sm:flex items-center gap-0.5 shrink-0 min-w-0"
            aria-label="Desktop navigation"
          >
            {user ? (
              <>
                {appLinks.map((link) => (
                  <Link key={link.href} href={link.href}>
                    <Button variant="ghost" size="sm" className="whitespace-nowrap">
                      <link.icon className="h-4 w-4 shrink-0" aria-hidden />
                      {t(ROUTE_LABEL_KEYS[link.href] || link.label)}
                    </Button>
                  </Link>
                ))}
                <div className="hidden lg:block w-36 shrink-0">
                  <LanguageSelector compact showLabel={false} />
                </div>
                <NotificationBadgeLink />
                <div className="ml-1 pl-1 border-l border-gray-200 shrink-0">
                  <ProfileMenu onLogout={handleLogout} />
                </div>
              </>
            ) : isLanding ? (
              <>
                {LANDING_PUBLIC_LINKS.filter((l) => l.href !== "/signup").map(
                  (link) => (
                    <Link key={link.href} href={link.href}>
                      <Button
                        variant={link.href === "/login" ? "ghost" : "ghost"}
                        size="sm"
                        className="whitespace-nowrap"
                      >
                        {t(ROUTE_LABEL_KEYS[link.href] || link.label)}
                      </Button>
                    </Link>
                  )
                )}
                <div className="hidden md:block w-32 mx-1">
                  <LanguageSelector compact showLabel={false} />
                </div>
                <Link href="/signup" className="ml-1">
                  <Button size="sm">{t("landing.ctaStart")}</Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    {t("common.login")}
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">{t("landing.ctaStart")}</Button>
                </Link>
              </>
            )}
          </nav>

          {/* Mobile: hamburger on landing or when logged in */}
          {showMobileMenuButton ? (
            <button
              type="button"
              className="sm:hidden flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-600 active:bg-gray-100 active:text-gray-900"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              <Menu className="h-6 w-6" />
            </button>
          ) : (
            <Link href="/login" className="sm:hidden shrink-0">
              <Button size="sm">Login</Button>
            </Link>
          )}
        </div>
      </header>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onLogout={handleLogout}
      />
    </>
  );
}
