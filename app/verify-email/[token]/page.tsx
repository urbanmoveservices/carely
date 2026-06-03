"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { AuthBrandLink } from "@/components/AuthBrandLink";
import { BrandLogo } from "@/components/BrandLogo";

export default function VerifyEmailPage() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    api
      .verifyEmail(token)
      .then(() => {
        setStatus("ok");
        setMessage("Email verified successfully.");
      })
      .catch((e: Error) => {
        setStatus("error");
        setMessage(e.message);
      });
  }, [token]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <AuthBrandLink className="mb-6" />
      <div className="w-full max-w-md text-center space-y-4">
        {status === "loading" && (
          <>
            <BrandLogo size="lg" className="mx-auto mb-2" />
            <p className="text-gray-600">Verifying email…</p>
          </>
        )}
        {status === "ok" && (
          <>
            <Alert variant="success">{message}</Alert>
            <Button onClick={() => router.push("/settings")}>Go to Settings</Button>
          </>
        )}
        {status === "error" && (
          <>
            <Alert variant="error">{message}</Alert>
            <Link href="/settings">
              <Button variant="outline">Settings</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
