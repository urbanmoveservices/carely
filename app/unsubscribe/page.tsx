"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

function UnsubscribeContent() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [scope, setScope] = useState<"marketing" | "lifecycle" | "all_optional">("marketing");
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [loading, setLoading] = useState(false);

  async function handleUnsubscribe() {
    if (!token) {
      setStatus("error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, scope }),
      });
      const data = await res.json();
      setStatus(data.success ? "ok" : "error");
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{BRAND.name} — Email preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!token ? (
            <p className="text-sm text-red-600">Invalid unsubscribe link.</p>
          ) : status === "ok" ? (
            <p className="text-sm text-green-700">
              Your email preferences were updated. You can change settings anytime in the app.
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Choose what to unsubscribe from. Account and security emails (verification, password
                reset, payment receipts) will still be sent when required.
              </p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="scope"
                  checked={scope === "marketing"}
                  onChange={() => setScope("marketing")}
                />
                Marketing and promotions only
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="scope"
                  checked={scope === "lifecycle"}
                  onChange={() => setScope("lifecycle")}
                />
                Marketing + lifecycle tips
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="scope"
                  checked={scope === "all_optional"}
                  onChange={() => setScope("all_optional")}
                />
                All optional emails (reports, reminders, tips)
              </label>
              <Button onClick={handleUnsubscribe} disabled={loading} className="w-full">
                {loading ? "Saving…" : "Confirm unsubscribe"}
              </Button>
              {status === "error" && (
                <p className="text-sm text-red-600">Could not process request. Link may be expired.</p>
              )}
            </>
          )}
          <Link href="/" className="text-sm text-teal-700 hover:underline block text-center">
            Back to {BRAND.name}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading…</div>}>
      <UnsubscribeContent />
    </Suspense>
  );
}
