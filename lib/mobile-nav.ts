/** Shared mobile navigation rules */

export const MOBILE_NAV_BAR_HEIGHT = "4.5rem";

export const BOTTOM_NAV_HIDDEN_PREFIXES = [
  "/login",
  "/signup",
  "/logout",
  "/admin",
  "/share",
  "/invite",
  "/emergency-card",
  "/onboarding",
  "/pricing",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/privacy",
  "/terms",
  "/disclaimer",
  "/consent",
  "/contact",
  "/about",
  "/help",
];

export const MORE_SECTION_PREFIXES = [
  "/more",
  "/billing",
  "/settings",
  "/search",
  "/insights",
  "/health-risks",
  "/lab-tests",
  "/symptoms",
  "/sharing",
  "/caregiver",
];

export function shouldShowMobileBottomNav(
  pathname: string,
  isAuthenticated: boolean
): boolean {
  if (!isAuthenticated) return false;
  if (pathname === "/") return false;
  if (BOTTOM_NAV_HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) {
    return false;
  }
  if (pathname.startsWith("/reports/")) return false;
  return true;
}

export function isNavItemActive(
  pathname: string,
  href: string,
  matchPrefix?: string
): boolean {
  if (pathname === href) return true;
  if (!matchPrefix) return false;
  if (href === "/more") return isMoreSectionActive(pathname);
  return pathname.startsWith(matchPrefix);
}

export function isMoreSectionActive(pathname: string): boolean {
  return MORE_SECTION_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}
