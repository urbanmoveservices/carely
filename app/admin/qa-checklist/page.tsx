"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { adminApi } from "@/lib/admin-api-client";
import { QA_CHECKLIST_GROUPS } from "@/lib/qa-checklist-seed";
import type { User } from "@/types";

type Item = {
  id: string;
  group: string;
  key: string;
  label: string;
  description?: string | null;
  status: string;
  notes?: string | null;
  updatedAt: string;
};

export default function AdminQaPage() {
  return (
    <AdminLayout>{(user) => <Content user={user} />}</AdminLayout>
  );
}

function Content({ user }: { user: User }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "pass" | "fail">("all");

  const load = () => {
    setLoading(true);
    adminApi
      .get<{ items: Item[] }>("/api/admin/qa-checklist")
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const pass = items.filter((i) => i.status === "pass").length;
    const fail = items.filter((i) => i.status === "fail").length;
    const pending = items.filter((i) => i.status === "pending").length;
    return { pass, fail, pending, total: items.length };
  }, [items]);

  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const item of items) {
      if (filter !== "all" && item.status !== filter) continue;
      const list = map.get(item.group) || [];
      list.push(item);
      map.set(item.group, list);
    }
    return QA_CHECKLIST_GROUPS.map((g) => ({
      ...g,
      items: map.get(g.id) || [],
    })).filter((g) => g.items.length > 0 || filter === "all");
  }, [items, filter]);

  const setStatus = async (id: string, status: "pass" | "fail" | "pending") => {
    await adminApi.patch(`/api/admin/qa-checklist/${id}`, { status });
    load();
  };

  const saveNotes = async (id: string, notes: string) => {
    await adminApi.patch(`/api/admin/qa-checklist/${id}`, { notes });
    load();
  };

  const seed = async (force = false) => {
    setSeeding(true);
    try {
      await adminApi.post("/api/admin/qa-checklist/seed", { force });
      load();
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div>
      <AdminHeader
        title="QA Checklist"
        description="Manual release verification for Vaidya GPT"
        user={user}
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <Badge variant="completed">{stats.pass} pass</Badge>
        <Badge variant="warning">{stats.pending} pending</Badge>
        <Badge variant="failed">{stats.fail} fail</Badge>
        <span className="text-sm text-gray-500 self-center">{stats.total} items</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(["all", "pending", "pass", "fail"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "primary" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f}
          </Button>
        ))}
        <Button size="sm" variant="outline" onClick={() => seed(false)} disabled={seeding}>
          Sync checklist
        </Button>
        <Button size="sm" variant="ghost" onClick={() => seed(true)} disabled={seeding}>
          Reset & reseed
        </Button>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      <div className="space-y-6">
        {grouped.map((group) => (
          <Card key={group.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{group.label}</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-gray-100 p-0">
              {group.items.length === 0 && (
                <p className="px-4 py-3 text-sm text-gray-400">No items in this filter.</p>
              )}
              {group.items.map((item) => (
                <div key={item.id} className="px-4 py-3 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      {item.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant={item.status === "pass" ? "primary" : "outline"}
                        onClick={() => setStatus(item.id, "pass")}
                      >
                        Pass
                      </Button>
                      <Button
                        size="sm"
                        variant={item.status === "fail" ? "primary" : "outline"}
                        onClick={() => setStatus(item.id, "fail")}
                      >
                        Fail
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setStatus(item.id, "pending")}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                  <textarea
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700"
                    rows={2}
                    placeholder="Notes (optional)"
                    defaultValue={item.notes ?? ""}
                    onBlur={(e) => {
                      if (e.target.value !== (item.notes ?? "")) {
                        saveNotes(item.id, e.target.value);
                      }
                    }}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
