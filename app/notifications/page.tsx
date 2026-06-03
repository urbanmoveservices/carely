"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { MobileShell } from "@/components/MobileShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api-client";
import type { AppNotificationItem } from "@/types";

export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <NotificationsContent />
    </ProtectedRoute>
  );
}

function NotificationsContent() {
  const [items, setItems] = useState<AppNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .getNotifications("limit=50")
      .then((r) => setItems(r.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async (id: string) => {
    await api.markNotificationRead(id);
    load();
  };

  const markAll = async () => {
    await api.markAllNotificationsRead();
    load();
  };

  return (
    <MobileShell>
      <AppHeader />
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
          {items.some((n) => !n.isRead) && (
            <Button variant="outline" size="sm" onClick={markAll}>
              Mark all read
            </Button>
          )}
        </div>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-12">No notifications yet.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((n) => (
              <li
                key={n.id}
                className={`rounded-2xl border p-4 ${n.isRead ? "border-gray-100 bg-white" : "border-brand-100 bg-brand-50/40"}`}
              >
                <div className="flex justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-gray-900 text-sm">{n.title}</h2>
                    <p className="text-sm text-gray-600 mt-1">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!n.isRead && (
                    <button
                      type="button"
                      onClick={() => markRead(n.id)}
                      className="text-xs text-brand-600 font-medium shrink-0"
                    >
                      Mark read
                    </button>
                  )}
                </div>
                {n.href && (
                  <Link href={n.href} className="text-xs text-brand-600 font-medium mt-2 inline-block">
                    Open
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </MobileShell>
  );
}
