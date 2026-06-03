"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Alert } from "@/components/ui/Alert";
import { AuthBrandLink } from "@/components/AuthBrandLink";
import { OtpCodeInput } from "@/components/auth/OtpCodeInput";
import { Eye, EyeOff } from "lucide-react";

export default function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const q = searchParams.get("email");
    if (q) setEmail(q);
  }, [searchParams]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const resend = async () => {
    if (!email) {
      setError("Enter your email first.");
      return;
    }
    setResendLoading(true);
    setError("");
    try {
      const res = await api.requestPasswordResetCode(email);
      setMessage(res.message);
      setCooldown(60);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not resend code.");
    } finally {
      setResendLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.resetPasswordWithCode(email, code, password);
      setMessage(res.message || "Password reset successfully.");
      setTimeout(() => router.push("/login"), 1500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Reset failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-50 via-white to-blue-50 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <AuthBrandLink className="mb-4 justify-center" />
          <h1 className="text-xl font-bold text-gray-900">Reset password</h1>
          <p className="text-sm text-gray-600 mt-2">
            Enter the 6-digit code from your email and choose a new password.
          </p>
        </div>

        {message ? (
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
          onSubmit={submit}
          className="space-y-4 rounded-2xl bg-white p-6 shadow-sm border border-gray-100"
        >
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <Label>Reset code</Label>
            <div className="mt-2">
              <OtpCodeInput value={code} onChange={setCode} disabled={loading} />
            </div>
          </div>

          <div>
            <Label htmlFor="password">New password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={8}
              required
            />
          </div>

          <Button type="submit" className="w-full" loading={loading} disabled={code.length !== 6}>
            Reset password
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            loading={resendLoading}
            disabled={cooldown > 0 || !email}
            onClick={() => void resend()}
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          <Link href="/login" className="text-brand-600 hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
