"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { cn } from "@/lib/utils";
import { isLandingPage, LANDING_PUBLIC_LINKS } from "@/lib/header-nav";
import { useTranslation } from "@/lib/i18n/use-translation";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ROUTE_LABEL_KEYS } from "@/lib/i18n/nav-keys";
import {
  X,
  LayoutDashboard,
  UploadCloud,
  Users,
  Settings,
  Shield,
  LogOut,
  Bell,
  Search,
  Lightbulb,
  ShieldAlert,
  FlaskConical,
  NotebookPen,
  Share2,
  HeartHandshake,
  HelpCircle,
  Mail,
  Info,
  FileText,
} from "lucide-react";

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}

const MENU_LINKS: {
  href: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  matchPrefix?: string;
}[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/upload", labelKey: "nav.upload", icon: UploadCloud },
  {
    href: "/family",
    labelKey: "nav.family",
    icon: Users,
    matchPrefix: "/family",
  },
  {
    href: "/reminders",
    labelKey: "nav.reminders",
    icon: Bell,
    matchPrefix: "/reminders",
  },
  { href: "/search", labelKey: "nav.search", icon: Search },
  { href: "/insights", labelKey: "nav.insights", icon: Lightbulb },
  { href: "/health-risks", labelKey: "nav.healthRisks", icon: ShieldAlert },
  { href: "/lab-tests", labelKey: "nav.labTests", icon: FlaskConical },
  { href: "/symptoms", labelKey: "nav.symptoms", icon: NotebookPen },
  { href: "/sharing", labelKey: "nav.sharing", icon: Share2 },
  { href: "/caregiver", labelKey: "nav.caregiver", icon: HeartHandshake },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
  {
    href: "/admin",
    labelKey: "common.admin",
    icon: Shield,
    adminOnly: true,
    matchPrefix: "/admin",
  },
];

export function MobileMenu({ open, onClose, onLogout }: MobileMenuProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const isLanding = isLandingPage(pathname);
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const isActive = (href: string, matchPrefix?: string) => {
    if (href.includes("#")) return false;
    return (
      pathname === href ||
      (matchPrefix != null && pathname.startsWith(matchPrefix))
    );
  };

  const navLink = (
    href: string,
    icon: typeof LayoutDashboard,
    label: string,
    matchPrefix?: string,
    highlight?: boolean
  ) => {
    const active = isActive(href, matchPrefix);
    const Icon = icon;
    return (
      <Link
        href={href}
        onClick={onClose}
        className={cn(
          "flex items-center gap-3 rounded-xl px-4 min-h-[48px] text-sm font-medium transition-colors",
          highlight
            ? "bg-brand-600 text-white active:bg-brand-700"
            : active
              ? "bg-brand-50 text-brand-700"
              : "text-gray-700 active:bg-gray-100"
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5 shrink-0",
            highlight
              ? "text-white"
              : active
                ? "text-brand-600"
                : "text-gray-400"
          )}
          aria-hidden
        />
        {label}
      </Link>
    );
  };

  const showPublicLandingMenu = !user && isLanding;

  return (
    <div
      className="fixed inset-0 z-[60] sm:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
    >
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        aria-hidden
      />

      <div
        className={cn(
          "absolute inset-y-0 right-0 flex w-[min(85vw,360px)] max-w-full flex-col",
          "bg-white shadow-2xl",
          "pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]",
          "animate-[slideIn_220ms_ease-out]"
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3 min-h-[56px]">
          <span className="text-base font-bold text-gray-900">Menu</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-500 active:bg-gray-100"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {user && (
          <div className="shrink-0 border-b border-gray-100 px-4 py-4">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {user.name}
            </p>
            <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
            <Badge
              variant={user.role === "admin" ? "admin" : "user"}
              className="mt-2"
            >
              {user.role}
            </Badge>
          </div>
        )}

        <div className="px-3 py-2 border-b border-gray-100">
          <LanguageSelector compact />
        </div>

        <nav className="flex-1 overflow-y-auto overscroll-contain py-2 px-2 space-y-0.5 scrollbar-none">
          {user ? (
            <>
              {MENU_LINKS.filter((l) => !l.adminOnly || user.role === "admin").map(
                (link) => (
                  <div key={link.href}>
                    {navLink(link.href, link.icon, t(link.labelKey), link.matchPrefix)}
                  </div>
                )
              )}
              <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Support & Legal
              </p>
              {navLink("/help", HelpCircle, t("common.help"))}
              {navLink("/contact", Mail, t("common.contact"))}
              {navLink("/about", Info, t("common.about"))}
              {navLink("/privacy", FileText, t("common.privacy"))}
              {navLink("/terms", FileText, t("common.terms"))}
            </>
          ) : showPublicLandingMenu ? (
            <>
              {LANDING_PUBLIC_LINKS.map((link) => (
                <div key={link.href}>
                  {link.href === "/signup" ? (
                    <div className="px-2 pt-2">
                      <Link href={link.href} onClick={onClose} className="block">
                        <Button size="lg" className="w-full">
                          Get Started
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    navLink(link.href, link.icon, link.label)
                  )}
                </div>
              ))}
            </>
          ) : (
            <>
              {navLink("/login", LayoutDashboard, t("common.login"))}
              <div className="px-2 pt-2">
                <Link href="/signup" onClick={onClose} className="block">
                  <Button size="lg" className="w-full">
                    Get Started
                  </Button>
                </Link>
              </div>
            </>
          )}
        </nav>

        {user && (
          <div className="shrink-0 border-t border-gray-100 px-3 py-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-4 min-h-[48px] text-sm font-medium text-red-600 active:bg-red-50 transition-colors"
            >
              <LogOut className="h-5 w-5 shrink-0" aria-hidden />
              {t("common.logout")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
