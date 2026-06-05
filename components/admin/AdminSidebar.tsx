"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { removeAdminToken } from "@/lib/admin-auth";
import { BrandLogo } from "@/components/BrandLogo";
import { BRAND } from "@/lib/brand";
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  Settings,
  ArrowLeft,
  LogOut,
  Activity,
  ScrollText,
  Bell,
  Search,
  FlaskConical,
  Apple,
  Share2,
  Languages,
  HeartPulse,
  ListChecks,
  AlertCircle,
  Cog,
  Mail,
  Ticket,
} from "lucide-react";

const links = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/search", label: "Search", icon: Search },
  { href: "/admin/lab-tests", label: "Lab Tests", icon: FlaskConical },
  { href: "/admin/nutrition", label: "IFCT Nutrition", icon: Apple },
  { href: "/admin/sharing", label: "Sharing", icon: Share2 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/documents", label: "Documents", icon: FileText },
  { href: "/admin/reports", label: "Reports", icon: ClipboardList },
  { href: "/admin/reminders", label: "Reminders", icon: Bell },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
  { href: "/admin/system-health", label: "System Health", icon: HeartPulse },
  { href: "/admin/ai-usage", label: "AI Usage", icon: Activity },
  { href: "/admin/qa-checklist", label: "QA Checklist", icon: ListChecks },
  { href: "/admin/error-logs", label: "Error Logs", icon: AlertCircle },
  { href: "/admin/jobs", label: "Jobs", icon: Cog },
  { href: "/admin/email-logs", label: "Email Logs", icon: Mail },
  { href: "/admin/email-marketing", label: "Email Marketing", icon: Mail },
  { href: "/admin/tickets", label: "Support Tickets", icon: Ticket },
  { href: "/admin/translation", label: "Translation", icon: Languages },
  { href: "/admin/health-risks", label: "Health Risks", icon: Activity },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    removeAdminToken();
    router.push("/admin/login");
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-gray-900 text-white">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-800">
        <BrandLogo size="sm" decorative />
        <div>
          <p className="font-bold text-sm">{BRAND.name}</p>
          <p className="text-xs text-gray-400">Admin Panel</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-800 px-3 py-4 space-y-1">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to App
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </aside>
  );
}
