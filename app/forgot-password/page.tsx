"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Alert } from "@/components/ui/Alert";
import { AuthBrandLink } from "@/components/AuthBrandLink";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const res = await api.requestPasswordResetCode(email);
      setMessage(res.message);
      router.push(`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-50 via-white to-blue-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <AuthBrandLink className="mb-4 justify-center" />
          <h1 className="text-xl font-bold text-gray-900">Forgot password</h1>
          <p className="text-sm text-gray-600 mt-2">
            We&apos;ll email you a 6-digit reset code if an account exists.
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
        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
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
          <Button type="submit" className="w-full" loading={loading}>
            Send reset code
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
