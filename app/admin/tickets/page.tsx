"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/admin-api-client";
import type { User } from "@/types";

type Ticket = {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
};

export default function AdminTicketsPage() {
  return (
    <AdminLayout>{(user) => <Content user={user} />}</AdminLayout>
  );
}

function Content({ user }: { user: User }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [reply, setReply] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const load = () =>
    adminApi.get<{ tickets: Ticket[] }>("/api/admin/tickets").then((r) => setTickets(r.tickets));

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <AdminHeader title="Support tickets" user={user} />
      <Card>
        <CardContent className="p-0 divide-y">
          {tickets.map((t) => (
            <div key={t.id} className="p-4 text-sm">
              <p className="font-medium">{t.subject}</p>
              <p className="text-gray-500">
                {t.category} · {t.status} · {t.priority}
              </p>
              <Button size="sm" className="mt-2" variant="outline" onClick={() => setSelected(t.id)}>
                Reply
              </Button>
              {selected === t.id && (
                <div className="mt-2 flex gap-2">
                  <input
                    className="flex-1 border rounded px-2 py-1 text-sm"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                  />
                  <Button
                    size="sm"
                    onClick={async () => {
                      await adminApi.patch(`/api/admin/support/tickets/${t.id}`, {
                        reply,
                        status: "pending",
                      });
                      setReply("");
                      setSelected(null);
                      load();
                    }}
                  >
                    Send
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
