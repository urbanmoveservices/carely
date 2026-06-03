"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { MobileShell } from "@/components/MobileShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RazorpayUpgradeButton } from "@/components/billing/RazorpayUpgradeButton";
import { UsageProgress } from "@/components/billing/UsageProgress";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api-client";
import Link from "next/link";
import type { BillingPlan, PaymentHistoryItem, UsageSummary, UserProfile } from "@/types";
import { useAuth } from "@/components/AuthProvider";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function BillingPage() {
  return (
    <ProtectedRoute>
      <BillingContent />
    </ProtectedRoute>
  );
}

function BillingContent() {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [razorpayConfigured, setRazorpayConfigured] = useState(false);
  const [razorpayMessage, setRazorpayMessage] = useState("");
  const [paymentsWarning, setPaymentsWarning] = useState("");
  const [msg, setMsg] = useState("");
  const [usageError, setUsageError] = useState("");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const billingProfileComplete =
    userProfile?.billingProfileCompleted ?? user?.billingProfileCompleted ?? false;

  const load = () => {
    setUsageError("");
    setPaymentsWarning("");
    Promise.all([
      api.getBillingUsage().catch(() => null),
      api.getBillingPlans(),
      api.getBillingPayments().catch(() => ({
        payments: [] as PaymentHistoryItem[],
        warning: undefined,
      })),
      api.getRazorpayStatus().catch(() => ({
        enabled: false,
        configured: false,
        keyIdPresent: false,
        currency: "INR",
        message: "Razorpay payments are not configured.",
      })),
      api.getProfile().catch(() => null),
    ]).then(([u, p, pay, rz, prof]) => {
      if (u) {
        setUsage(u);
      } else {
        setUsage(null);
        setUsageError(
          "Usage data is temporarily unavailable. If this persists, stop the dev server, run npx prisma generate, then npm run dev."
        );
      }
      setPlans(p.plans);
      const configured = rz.configured && rz.keyIdPresent;
      setRazorpayConfigured(configured);
      setRazorpayMessage(
        configured
          ? ""
          : rz.message || "Razorpay payments are not configured."
      );
      setPayments(pay.payments);
      if ("warning" in pay && pay.warning) setPaymentsWarning(pay.warning);
      if (prof) setUserProfile(prof);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const currentPlan = user?.currentPlan || usage?.plan || "free";

  return (
    <MobileShell>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t("settings.planBilling")}</h1>
          <p className="text-sm text-gray-600 mt-2">
            {razorpayConfigured
              ? t("billing.razorpayNote")
              : razorpayMessage || "Razorpay payments are not configured."}
          </p>
          {razorpayConfigured && (
            <p className="text-xs text-gray-500 mt-2">
              Test mode: use Indian domestic card{" "}
              <span className="font-mono">5267 3181 8797 5449</span> or UPI{" "}
              <span className="font-mono">success@razorpay</span>. International cards
              are not enabled on this Razorpay account.
            </p>
          )}
        </div>

        {usageError && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            {usageError}
          </p>
        )}

        {msg && (
          <p className="text-sm text-brand-700 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">
            {msg}
          </p>
        )}

        {usage && (
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-900">{t("billing.currentPlan")}</h2>
                <p className="text-sm text-gray-500">{usage.monthKey}</p>
              </div>
              <Badge variant="info">{usage.planName}</Badge>
            </div>
            <p className="text-lg font-bold text-brand-700 mb-1">{usage.priceLabel}</p>
            <p className="text-sm text-gray-500 mb-4">
              Status: {usage.subscriptionStatus}
              {usage.planExpiresAt && (
                <> · Expires {new Date(usage.planExpiresAt).toLocaleDateString()}</>
              )}
            </p>
            <div className="space-y-3">
              <UsageProgress
                label="Uploads this month"
                used={usage.usage.uploadsUsed}
                limit={usage.usage.uploadsLimit}
              />
              <UsageProgress
                label="AI summaries"
                used={usage.usage.aiSummariesUsed}
                limit={usage.usage.aiSummariesLimit}
              />
              <UsageProgress
                label="Family members"
                used={usage.usage.familyMembersUsed}
                limit={usage.usage.familyMembersLimit}
              />
              <p className="text-sm text-gray-600">
                Caregiver sharing:{" "}
                {usage.usage.caregiverSharing ? (
                  <span className="text-green-700 font-medium">Included</span>
                ) : (
                  <span className="text-gray-500">Family plan only</span>
                )}
              </p>
            </div>
          </section>
        )}

        {razorpayConfigured && !billingProfileComplete && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-amber-900">
              Complete your billing profile to upgrade with Razorpay (name and phone
              required).
            </p>
            <Link href="/settings/profile?next=/billing&reason=billing">
              <Button size="sm">Complete Profile</Button>
            </Link>
          </div>
        )}

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-3">{t("billing.upgradePlans")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["pro", "family"] as const).map((planKey) => {
              const planInfo = plans.find((p) => p.key === planKey);
              const isCurrent = currentPlan === planKey;
              return (
                <div
                  key={planKey}
                  className="rounded-xl border border-gray-100 p-4 flex flex-col gap-3"
                >
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {planKey === "pro" ? t("billing.pro") : t("billing.family")}
                    </h3>
                    <p className="text-sm text-brand-700 font-medium">
                      {planInfo?.priceLabel ?? (planKey === "pro" ? "₹9/month" : "₹249/month")}
                    </p>
                  </div>
                  {isCurrent ? (
                    <>
                      <Badge className="w-fit">Current plan</Badge>
                      <p className="text-xs text-gray-500">Current plan</p>
                    </>
                  ) : (
                    <RazorpayUpgradeButton
                      plan={planKey}
                      disabled={!razorpayConfigured || !billingProfileComplete}
                      disabledReason={
                        !razorpayConfigured
                          ? razorpayMessage || "Razorpay payments are not configured."
                          : !billingProfileComplete
                            ? "Phone number required for Razorpay"
                            : undefined
                      }
                      userName={user?.name}
                      userEmail={user?.email}
                      onSuccess={async (message) => {
                        setMsg(message);
                        load();
                        await refreshUser();
                      }}
                      onError={(message) => setMsg(message)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {plans.length > 0 && (
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-3">Plan comparison</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="py-2 pr-4">Plan</th>
                    <th className="py-2 pr-4">Uploads</th>
                    <th className="py-2 pr-4">AI</th>
                    <th className="py-2">Family</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p) => (
                    <tr key={p.key} className="border-b border-gray-50">
                      <td className="py-2 pr-4 font-medium">{p.name}</td>
                      <td className="py-2 pr-4">{p.uploadsPerMonth}</td>
                      <td className="py-2 pr-4">{p.aiSummariesPerMonth}</td>
                      <td className="py-2">{p.familyMembersLimit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-3">{t("billing.paymentHistory")}</h2>
          {paymentsWarning && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1 mb-2">
              {paymentsWarning}
            </p>
          )}
          {payments.length === 0 ? (
            <p className="text-sm text-gray-500">{t("billing.noPaymentsYet")}</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {payments.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap justify-between gap-2 border-b border-gray-50 pb-2"
                >
                  <span className="font-medium capitalize">{p.plan}</span>
                  <span>
                    ₹{(p.amountPaise / 100).toFixed(p.plan === "pro" ? 2 : 0)} ·{" "}
                    {p.verified ? "Verified" : p.status}
                  </span>
                  <span className="text-gray-500 w-full text-xs">
                    {new Date(p.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </MobileShell>
  );
}
