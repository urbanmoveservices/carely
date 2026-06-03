"use client";



import { useRouter } from "next/navigation";

import { OnboardingShell } from "@/components/OnboardingShell";

import { OnboardingExitControls } from "@/components/onboarding/OnboardingExitControls";

import { Button } from "@/components/ui/Button";

import { ProtectedRoute } from "@/components/ProtectedRoute";

import { Upload, Users, User } from "lucide-react";



export default function OnboardingWelcomePage() {

  return (

    <ProtectedRoute>

      <OnboardingWelcome />

    </ProtectedRoute>

  );

}



function OnboardingWelcome() {

  const router = useRouter();



  return (

    <OnboardingShell step={1}>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">

        Welcome to Vaidya GPT

      </h1>

      <p className="text-gray-600 mb-8">

        Set up your account in three quick steps to start understanding medical

        reports.

      </p>

      <ol className="space-y-4 mb-8">

        {[

          { icon: User, title: "Set up profile", desc: "Confirm your name and goals" },

          { icon: Users, title: "Add family", desc: "Add yourself or a family member" },

          { icon: Upload, title: "Upload a report", desc: "Optional first upload" },

        ].map((s, i) => (

          <li

            key={i}

            className="flex gap-3 rounded-xl border border-gray-100 bg-white p-4"

          >

            <s.icon className="h-5 w-5 text-brand-600 shrink-0" />

            <div>

              <p className="font-semibold text-gray-900">{s.title}</p>

              <p className="text-sm text-gray-500">{s.desc}</p>

            </div>

          </li>

        ))}

      </ol>

      <Button className="w-full" size="lg" onClick={() => router.push("/onboarding/profile")}>

        Start setup

      </Button>

      <OnboardingExitControls />

    </OnboardingShell>

  );

}


