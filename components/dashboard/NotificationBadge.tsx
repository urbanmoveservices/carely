"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Bell } from "lucide-react";
import { subscribeDashboardRefresh } from "@/lib/dashboard-events";

export function NotificationBadgeLink() {
  const [count, setCount] = useState(0);

  const load = useCallback(() => {
    api
      .getNotifications("unreadOnly=true&limit=1")
      .then((r) => setCount(r.unreadCount))
      .catch(() => setCount(0));
  }, []);

  useEffect(() => {
    load();
    return subscribeDashboardRefresh(load);
  }, [load]);

  return (
    <Link
      href="/notifications"
      className="relative inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-gray-600 hover:bg-gray-100"
      aria-label={`Notifications${count > 0 ? `, ${count} unread` : ""}`}
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
