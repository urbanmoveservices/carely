"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api-client";

const CATEGORIES = [
  "Account",
  "Upload issue",
  "AI summary issue",
  "Billing / Razorpay payment issue",
  "Privacy/data request",
  "Technical bug",
  "Medical safety concern",
  "Other",
];

export default function NewTicketPage() {
  return (
    <ProtectedRoute>
      <NewTicket />
    </ProtectedRoute>
  );
}

function NewTicket() {
  const router = useRouter();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="mx-auto max-w-xl px-4 py-8">
        <Link href="/help/tickets" className="text-sm text-brand-600 hover:underline">
          ← Tickets
        </Link>
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>New support ticket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <select
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <textarea
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm min-h-[120px]"
              placeholder="Describe your issue"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <Button
              onClick={async () => {
                const res = await api.post<{ ticket: { id: string } }>("/api/support/tickets", {
                  category,
                  subject,
                  message,
                });
                router.push(`/help/tickets/${res.ticket.id}`);
              }}
            >
              Submit
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
