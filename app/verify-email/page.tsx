"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { OtpCodeInput } from "@/components/auth/OtpCodeInput";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { AuthBrandLink } from "@/components/AuthBrandLink";
import { api } from "@/lib/api-client";
import { maskEmail } from "@/lib/auth/mask-email";

export default function VerifyEmailPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [emailMasked, setEmailMasked] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    if (user?.email) {
      setEmailMasked(maskEmail(user.email));
    }
  }, [user?.email]);

  const sendCode = useCallback(async () => {
    setResendLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await api.sendEmailVerificationCode();
      setEmailMasked(res.emailMasked || emailMasked);
      setMessage(res.message || "Verification code sent.");
      if (res.code === "EMAIL_ALREADY_VERIFIED") {
        await refreshUser();
      } else {
        setCooldown(60);
      }
    } catch (e: unknown) {
      const err = e as Error & { code?: string; retryAfterSeconds?: number };
      setError(err.message || "Could not send code.");
      if (err.retryAfterSeconds) setCooldown(err.retryAfterSeconds);
    } finally {
      setResendLoading(false);
    }
  }, [emailMasked, refreshUser]);

  const initialSent = useRef(false);

  useEffect(() => {
    if (!loading && user && !user.emailVerified && !initialSent.current) {
      initialSent.current = true;
      void sendCode();
    }
  }, [loading, user, sendCode]);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyLoading(true);
    setError("");
    try {
      const res = await api.verifyEmailCode(code);
      setMessage(res.message || "Email verified.");
      await refreshUser();
      router.push(user?.onboardingCompleted ? "/dashboard" : "/onboarding");
    } catch (e: unknown) {
      const err = e as Error & { code?: string };
      setError(err.message || "Verification failed.");
    } finally {
      setVerifyLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <p className="text-gray-600 mb-4">Sign in to verify your email.</p>
        <Link href="/login" className="text-brand-600 hover:underline">
          Go to login
        </Link>
      </div>
    );
  }

  if (user.emailVerified) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-50 via-white to-blue-50 px-4">
        <div className="w-full max-w-sm text-center">
          <AuthBrandLink className="mb-4 justify-center" />
          <Alert variant="success" className="mb-4">
            Email already verified
          </Alert>
          <Button className="w-full" onClick={() => router.push("/dashboard")}>
            Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-50 via-white to-blue-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <AuthBrandLink className="mb-4 justify-center" />
          <h1 className="text-xl font-bold text-gray-900">Verify your email</h1>
          <p className="text-sm text-gray-600 mt-2">
            Enter the 6-digit code sent to{" "}
            <span className="font-medium">{emailMasked || "your email"}</span>
          </p>
        </div>

        {message && !error ? (
          <Alert variant="success" className="mb-4">
            {message}
          </Alert>
        ) : null}
        {error ? (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        ) : null}

        <form
          onSubmit={verify}
          className="space-y-6 rounded-2xl bg-white p-6 shadow-sm border border-gray-100"
        >
          <OtpCodeInput value={code} onChange={setCode} disabled={verifyLoading} />
          <Button
            type="submit"
            className="w-full"
            loading={verifyLoading}
            disabled={code.length !== 6}
          >
            Verify email
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            loading={resendLoading}
            disabled={cooldown > 0}
            onClick={() => void sendCode()}
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          <Link href="/settings" className="text-brand-600 hover:underline">
            Account settings
          </Link>
          {" · "}
          <Link href="/dashboard" className="text-brand-600 hover:underline">
            Skip for now
          </Link>
        </p>
      </div>
    </div>
  );
}
