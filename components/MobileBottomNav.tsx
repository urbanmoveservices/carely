"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import {
  shouldShowMobileBottomNav,
  isNavItemActive,
  isMoreSectionActive,
} from "@/lib/mobile-nav";
import { Home, UploadCloud, Users, Bell, Grid3x3 } from "lucide-react";
import { useTranslation } from "@/lib/i18n/use-translation";
import { ROUTE_LABEL_KEYS } from "@/lib/i18n/nav-keys";

const NAV_ITEMS = [
  { href: "/dashboard", icon: Home },
  {
    href: "/family",
    icon: Users,
    matchPrefix: "/family",
  },
  { href: "/upload", icon: UploadCloud },
  {
    href: "/reminders",
    icon: Bell,
    matchPrefix: "/reminders",
  },
  {
    href: "/more",
    icon: Grid3x3,
    matchPrefix: "/more",
  },
] as const;

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  badge,
  center,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
  badge?: number;
  center?: boolean;
}) {
  if (center) {
    return (
      <Link
        href={href}
        className="flex flex-col items-center justify-end pb-1 min-h-[44px] -mt-3"
        aria-current={active ? "page" : undefined}
      >
        <span
          className={cn(
            "flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full shadow-lg ring-4 ring-white transition-colors",
            active
              ? "bg-brand-700 text-white"
              : "bg-brand-600 text-white active:bg-brand-700"
          )}
        >
          <Icon className="h-6 w-6" strokeWidth={2.5} aria-hidden />
        </span>
        <span
          className={cn(
            "mt-1 text-[10px] font-semibold leading-tight",
            active ? "text-brand-600" : "text-gray-500"
          )}
        >
          {label}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "relative flex flex-col items-center justify-center gap-0.5 py-1.5 min-h-[44px] min-w-0 flex-1",
        active ? "text-brand-600" : "text-gray-400"
      )}
      aria-current={active ? "page" : undefined}
    >
      <span className="relative flex items-center justify-center">
        <Icon
          className={cn("h-5 w-5 shrink-0", active && "text-brand-600")}
          strokeWidth={active ? 2.5 : 2}
          aria-hidden
        />
        {badge != null && badge > 0 && (
          <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      <span
        className={cn(
          "text-[10px] font-medium leading-tight truncate max-w-full px-0.5",
          active && "font-semibold"
        )}
      >
        {label}
      </span>
    </Link>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const [badge, setBadge] = useState(0);

  useEffect(() => {
    if (!user) return;
    api
      .getHealthToday()
      .then((h) => setBadge(h.stats.pendingReminders))
      .catch(() => {});
  }, [user, pathname]);

  if (loading || !user) return null;
  if (!shouldShowMobileBottomNav(pathname, true)) return null;

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 inset-x-0 z-50 border-t border-gray-200/90 bg-white/95 backdrop-blur-lg shadow-[0_-4px_16px_rgba(0,0,0,0.06)] sm:hidden pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="mx-auto grid h-[4.5rem] max-w-lg w-full grid-cols-5 items-end px-0.5 pt-0.5">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/more"
              ? isMoreSectionActive(pathname)
              : isNavItemActive(
                  pathname,
                  item.href,
                  "matchPrefix" in item ? item.matchPrefix : undefined
                );
          const labelKey = ROUTE_LABEL_KEYS[item.href] || "common.more";
          return (
            <NavItem
              key={item.href}
              href={item.href}
              label={t(labelKey)}
              icon={item.icon}
              active={active}
              center={item.href === "/upload"}
              badge={item.href === "/reminders" ? badge : undefined}
            />
          );
        })}
      </div>
    </nav>
  );
}
