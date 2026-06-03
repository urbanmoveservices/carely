"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api-client";

export default function TicketDetailPage() {
  return (
    <ProtectedRoute>
      <TicketDetail />
    </ProtectedRoute>
  );
}

function TicketDetail() {
  const id = useParams().id as string;
  const [ticket, setTicket] = useState<{
    subject: string;
    messages: { senderRole: string; message: string; createdAt: string }[];
  } | null>(null);
  const [reply, setReply] = useState("");

  const load = () =>
    api
      .get<{
        ticket: {
          subject: string;
          messages: { senderRole: string; message: string; createdAt: string }[];
        };
      }>(`/api/support/tickets/${id}`)
      .then((r) => setTicket(r.ticket));

  useEffect(() => {
    load();
  }, [id]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="mx-auto max-w-xl px-4 py-8">
        <Link href="/help/tickets" className="text-sm text-brand-600 hover:underline">
          ← Tickets
        </Link>
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>{ticket?.subject || "Ticket"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ticket?.messages.map((m, i) => (
              <div key={i} className="text-sm rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-400">{m.senderRole}</p>
                <p>{m.message}</p>
              </div>
            ))}
            <textarea
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
            />
            <Button
              onClick={async () => {
                await api.post(`/api/support/tickets/${id}/messages`, { message: reply });
                setReply("");
                load();
              }}
            >
              Reply
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
