/** Shared header / drawer link definitions */

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  UploadCloud,
  Users,
  Bell,
  Search,
  Grid3x3,
  Shield,
  Sparkles,
  ListOrdered,
  FlaskConical,
  LogIn,
  UserPlus,
} from "lucide-react";

export const LANDING_PUBLIC_LINKS: {
  href: string;
  label: string;
  icon: LucideIcon;
  isHash?: boolean;
}[] = [
  { href: "/#features", label: "Features", icon: Sparkles, isHash: true },
  { href: "/#how-it-works", label: "How it Works", icon: ListOrdered, isHash: true },
  { href: "/lab-tests", label: "Lab Tests", icon: FlaskConical },
  { href: "/pricing", label: "Pricing", icon: Sparkles },
  { href: "/login", label: "Login", icon: LogIn },
  { href: "/signup", label: "Get Started", icon: UserPlus },
];

export const APP_DESKTOP_LINKS: {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload", icon: UploadCloud },
  { href: "/family", label: "Family", icon: Users },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/search", label: "Search", icon: Search },
  { href: "/more", label: "More", icon: Grid3x3 },
  { href: "/admin", label: "Admin Panel", icon: Shield, adminOnly: true },
];

export function isLandingPage(pathname: string): boolean {
  return pathname === "/";
}
