"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api-client";

type Ticket = { id: string; subject: string; status: string; category: string };

export default function HelpTicketsPage() {
  return (
    <ProtectedRoute>
      <TicketsList />
    </ProtectedRoute>
  );
}

function TicketsList() {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    api.get<{ tickets: Ticket[] }>("/api/support/tickets").then((r) => setTickets(r.tickets));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Support tickets</h1>
        <Link href="/help/tickets/new">
          <Button className="mb-6">New ticket</Button>
        </Link>
        <Card>
          <CardContent className="divide-y p-0">
            {tickets.map((t) => (
              <Link
                key={t.id}
                href={`/help/tickets/${t.id}`}
                className="block px-4 py-3 text-sm hover:bg-gray-50"
              >
                {t.subject} — {t.status}
              </Link>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
