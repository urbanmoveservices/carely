"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { MobileBottomNav } from "./MobileBottomNav";
import { shouldShowMobileBottomNav } from "@/lib/mobile-nav";
import { cn } from "@/lib/utils";

interface MobileShellProps {
  children: React.ReactNode;
  /** Force-hide bottom nav on this page */
  hideBottomNav?: boolean;
}

export function MobileShell({ children, hideBottomNav }: MobileShellProps) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const showBottomNav =
    !hideBottomNav &&
    !loading &&
    !!user &&
    shouldShowMobileBottomNav(pathname, true);

  return (
    <div
      className={cn(
        "min-h-screen bg-gray-50",
        showBottomNav && "mobile-page-padding"
      )}
    >
      {children}
      {showBottomNav && <MobileBottomNav />}
    </div>
  );
}
