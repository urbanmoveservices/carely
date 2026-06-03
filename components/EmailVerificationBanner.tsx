"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { api } from "@/lib/api-client";
import { Alert } from "./ui/Alert";
import { Button } from "./ui/Button";
import { X, Mail } from "lucide-react";
import { useTranslation } from "@/lib/i18n/use-translation";

export function EmailVerificationBanner() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  if (!user || user.emailVerified || dismissed || user.role === "admin") {
    return null;
  }

  const send = async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await api.sendEmailVerificationCode();
      setMsg(res.message);
      await refreshUser();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Alert variant="info" className="mb-4 relative">
      <button
        type="button"
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pr-6">
        <div className="flex items-start gap-2 flex-1">
          <Mail className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-gray-900">
              {t("dashboard.verifyEmail")}
            </p>
            {msg && <p className="text-sm mt-1 text-gray-600">{msg}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={send} loading={loading}>
            {t("dashboard.sendVerificationCode")}
          </Button>
          <Button size="sm" onClick={() => router.push("/verify-email")}>
            {t("dashboard.enterVerificationCode")}
          </Button>
        </div>
      </div>
    </Alert>
  );
}
