"use client";

import { Suspense } from "react";
import ResetPasswordContent from "./ResetPasswordContent";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-gray-500">
          Loading…
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
