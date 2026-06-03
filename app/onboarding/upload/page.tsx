"use client";



import Link from "next/link";

import { useRouter } from "next/navigation";

import { OnboardingShell } from "@/components/OnboardingShell";

import { OnboardingExitControls } from "@/components/onboarding/OnboardingExitControls";

import { Button } from "@/components/ui/Button";

import { ProtectedRoute } from "@/components/ProtectedRoute";

import { Upload } from "lucide-react";



export default function OnboardingUploadPage() {

  return (

    <ProtectedRoute>

      <OnboardingUpload />

    </ProtectedRoute>

  );

}



function OnboardingUpload() {

  const router = useRouter();



  return (

    <OnboardingShell step={4}>

      <h1 className="text-xl font-bold text-gray-900 mb-2">Upload your first report</h1>

      <p className="text-sm text-gray-500 mb-6">

        Upload a lab report or health document to see AI summaries and insights.

      </p>

      <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 p-8 text-center mb-6">

        <Upload className="mx-auto h-10 w-10 text-brand-600 mb-3" />

        <p className="text-sm text-gray-600 mb-4">PDF, JPG, PNG, or DOCX</p>

        <Link href="/upload">

          <Button>Upload report</Button>

        </Link>

      </div>

      <Button

        variant="outline"

        className="w-full"

        onClick={() => router.push("/onboarding/complete")}

      >

        Continue without uploading

      </Button>

      <OnboardingExitControls />

    </OnboardingShell>

  );

}


