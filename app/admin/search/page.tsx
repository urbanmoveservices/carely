"use client";

import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { adminApi } from "@/lib/admin-api-client";
import type { User, AdminSearchResponse } from "@/types";
import Link from "next/link";
import { Search } from "lucide-react";

export default function AdminSearchPage() {
  return (
    <AdminLayout>
      {(user) => <AdminSearchContent user={user} />}
    </AdminLayout>
  );
}

function AdminSearchContent({ user }: { user: User }) {
  const [q, setQ] = useState("");
  const [data, setData] = useState<AdminSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const run = () => {
    if (!q.trim()) return;
    setLoading(true);
    adminApi
      .adminSearch(q.trim())
      .then(setData)
      .finally(() => setLoading(false));
  };

  return (
    <div>
      <AdminHeader title="Search" description="Search users, documents, and family data" user={user} />
      <div className="flex gap-2 mb-6 max-w-xl">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          onKeyDown={(e) => e.key === "Enter" && run()}
        />
        <Button onClick={run} disabled={loading}>
          <Search className="h-4 w-4" />
          Search
        </Button>
      </div>

      {data && (
        <div className="space-y-6">
          <p className="text-sm text-gray-600">{data.total} results for &quot;{data.query}&quot;</p>
          {(["users", "documents", "reports", "familyMembers", "reminders"] as const).map(
            (key) => {
              const items = data.results[key];
              if (!items.length) return null;
              const labels: Record<string, string> = {
                users: "Users",
                documents: "Documents",
                reports: "Reports",
                familyMembers: "Family members",
                reminders: "Reminders",
              };
              return (
                <section key={key}>
                  <h2 className="font-semibold text-gray-900 mb-2">{labels[key]}</h2>
                  <ul className="space-y-2">
                    {items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border bg-white p-3"
                      >
                        <div>
                          <p className="font-medium text-sm">{item.title}</p>
                          {item.subtitle && (
                            <p className="text-xs text-gray-500">{item.subtitle}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {item.badge && <Badge variant="default">{item.badge}</Badge>}
                          <Link href={item.href} className="text-sm text-brand-600">
                            Open
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}
