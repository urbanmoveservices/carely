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

export default function SignupPage() {
  const { user, signup } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [legalConsent, setLegalConsent] = useState(false);
  const [consentError, setConsentError] = useState("");
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
    setConsentError("");
    if (!legalConsent) {
      setConsentError(
        "Please accept the Terms, Privacy Policy, and medical consent to continue."
      );
      return;
    }
    setLoading(true);
    try {
      await signup(name, email, password, true);
      router.push("/verify-email");
    } catch (err: any) {
      setError(err.message || "Signup failed");
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
            <h1 className="text-2xl font-bold text-gray-900">{t("auth.signup")}</h1>
            <p className="mt-1 text-sm text-gray-500">{t("auth.signupSubtitle")}</p>
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
                label={t("auth.name")}
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-12"
              />
              <Input
                label="Email"
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
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
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
              <label className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={legalConsent}
                  onChange={(e) => {
                    setLegalConsent(e.target.checked);
                    if (e.target.checked) setConsentError("");
                  }}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  required
                />
                <span className="text-xs text-gray-600 leading-relaxed">
                  {t("auth.consentShort")}
                </span>
              </label>
              {consentError && (
                <p className="text-sm text-red-600" role="alert">
                  {consentError}
                </p>
              )}
              <Button
                type="submit"
                loading={loading}
                className="w-full h-12 text-base"
              >
                {t("auth.createAccount")}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              {t("auth.haveAccount")}{" "}
              <Link
                href="/login"
                className="font-medium text-brand-600 hover:text-brand-500"
              >
                {t("auth.login")}
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-2 text-center">
        <p className="text-[11px] text-gray-400 leading-relaxed max-w-sm mx-auto">
          Operated by UrbanMove Services Private Limited. AI-assisted medical diagnosis
          and treatment guidance.
        </p>
        <p className="text-[11px] text-gray-400 mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
          <Link href="/privacy" className="text-brand-600 hover:underline">
            Privacy
          </Link>
          <Link href="/terms" className="text-brand-600 hover:underline">
            Terms
          </Link>
          <Link href="/disclaimer" className="text-brand-600 hover:underline">
            Disclaimer
          </Link>
          <Link href="/help" className="text-brand-600 hover:underline">
            Help
          </Link>
        </p>
      </div>
    </div>
  );
}
