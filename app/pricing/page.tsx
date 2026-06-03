"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/components/AuthProvider";
import { TryDemoButton } from "@/components/TryDemoButton";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api-client";
import type { BillingPlan, PlanKey } from "@/types";
import { Check } from "lucide-react";
import { PublicFooter } from "@/components/PublicFooter";

export default function PricingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<BillingPlan[]>([]);

  useEffect(() => {
    api.getBillingPlans().then((r) => setPlans(r.plans)).catch(() => {});
  }, []);

  const cta = (key: PlanKey) => {
    if (!user) {
      return (
        <Link href="/signup">
          <Button className="w-full">Get Started</Button>
        </Link>
      );
    }
    if (user.currentPlan === key) {
      return (
        <Button variant="outline" className="w-full" disabled>
          Current Plan
        </Button>
      );
    }
    return (
      <Link href="/billing">
        <Button className="w-full">Upgrade</Button>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Simple, transparent plans</h1>
          <p className="text-gray-500 mt-2 max-w-xl mx-auto">
            Choose the plan that fits your health journey. Pro and Family plans are
            purchased securely through Razorpay.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={`rounded-2xl border bg-white p-6 shadow-sm flex flex-col ${
                plan.key === "pro" ? "border-brand-300 ring-2 ring-brand-100" : "border-gray-100"
              }`}
            >
              {plan.key === "pro" && (
                <Badge className="mb-3 w-fit">Popular</Badge>
              )}
              <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
              <p className="text-2xl font-bold text-brand-700 mt-1">{plan.priceLabel}</p>
              <p className="text-sm text-gray-500 mt-2 mb-4">{plan.description}</p>
              <ul className="space-y-2 text-sm text-gray-700 flex-1 mb-6">
                <li className="flex gap-2">
                  <Check className="h-4 w-4 text-brand-600 shrink-0" />
                  {plan.uploadsPerMonth} uploads / month
                </li>
                <li className="flex gap-2">
                  <Check className="h-4 w-4 text-brand-600 shrink-0" />
                  {plan.aiSummariesPerMonth} AI summaries / month
                </li>
                <li className="flex gap-2">
                  <Check className="h-4 w-4 text-brand-600 shrink-0" />
                  Up to {plan.familyMembersLimit} family members
                </li>
                <li className="flex gap-2">
                  <Check className="h-4 w-4 text-brand-600 shrink-0" />
                  Caregiver sharing: {plan.caregiverSharing ? "Yes" : "No"}
                </li>
              </ul>
              {cta(plan.key)}
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <TryDemoButton />
          <Button variant="outline" onClick={() => router.push(user ? "/dashboard" : "/signup")}>
            {user ? "Go to Dashboard" : "Start Free"}
          </Button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-8">
          Free plan requires no payment. Paid plans activate after Razorpay payment
          verification on the billing page.
        </p>
      </main>
      <PublicFooter compact />
    </div>
  );
}
