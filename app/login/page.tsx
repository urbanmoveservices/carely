"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Eye, EyeOff } from "lucide-react";
import { AuthBrandLink } from "@/components/AuthBrandLink";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function LoginPage() {
  const { user, login } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm text-center">
          <BrandLogo size="lg" className="mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            You&apos;re already logged in
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Welcome back, {user.name}.
          </p>
          <Link href="/dashboard">
            <Button className="w-full">Continue to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-brand-50 via-white to-blue-50">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <AuthBrandLink className="mb-5" />
            <h1 className="text-2xl font-bold text-gray-900">{t("auth.login")}</h1>
            <p className="mt-1 text-sm text-gray-500">{t("auth.loginSubtitle")}</p>
          </div>

          <div className="mb-4">
            <LanguageSelector compact />
          </div>

          <div className="rounded-2xl border border-gray-200/80 bg-white p-6 sm:p-8 shadow-sm">
            {error && (
              <div className="mb-4">
                <Alert variant="error">{error}</Alert>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label={t("auth.email")}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
              <div className="relative">
                <Input
                  label={t("auth.password")}
                  type={showPw ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-sm text-brand-600 hover:underline"
                >
                  {t("auth.forgotPassword")}
                </Link>
              </div>
              <Button
                type="submit"
                loading={loading}
                className="w-full h-12 text-base"
              >
                {t("auth.login")}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              {t("auth.noAccount")}{" "}
              <Link
                href="/signup"
                className="font-medium text-brand-600 hover:text-brand-500"
              >
                {t("common.signup")}
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-6 text-center">
        <p className="text-[11px] text-gray-400 leading-relaxed max-w-sm mx-auto">
          Operated by UrbanMove Services Private Limited. AI-assisted diagnosis and
          treatment guidance.
        </p>
        <p className="text-[11px] text-gray-400 mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
          <Link href="/privacy" className="text-brand-600 hover:underline">
            {t("common.privacy")}
          </Link>
          <Link href="/terms" className="text-brand-600 hover:underline">
            {t("common.terms")}
          </Link>
          <Link href="/help" className="text-brand-600 hover:underline">
            {t("common.help")}
          </Link>
        </p>
      </div>
    </div>
  );
}
