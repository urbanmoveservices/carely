"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { MessageCircle } from "lucide-react";
import { shouldShowMobileBottomNav } from "@/lib/mobile-nav";

function resolveChatHref(pathname: string): string {
  const reportMatch = pathname.match(/^\/reports\/([^/]+)$/);
  if (reportMatch) return `/reports/${reportMatch[1]}/chat`;
  if (pathname.match(/^\/reports\/[^/]+\/chat/)) return pathname;
  if (pathname === "/health-chat") return "/health-chat";
  return "/chat";
}

const HIDDEN_PREFIXES = [
  "/login",
  "/signup",
  "/admin",
  "/share",
  "/emergency-card",
  "/onboarding",
];

export function FloatingChatButton() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  if (loading || !user) return null;
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  if (pathname.endsWith("/chat")) return null;

  const href = resolveChatHref(pathname);
  const bottomClass = shouldShowMobileBottomNav(pathname, true)
    ? "bottom-[calc(4.5rem+0.75rem)]"
    : "bottom-4";

  return (
    <Link
      href={href}
      className={`fixed right-4 z-40 inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${bottomClass} md:bottom-6`}
      aria-label="Ask Vaidya GPT"
    >
      <MessageCircle className="h-5 w-5 shrink-0" aria-hidden />
      <span className="hidden sm:inline">Ask Vaidya GPT</span>
      <span className="sm:hidden">Ask</span>
    </Link>
  );
}
