"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function LogoutPage() {
  const { logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    logout();
    router.replace("/login");
  }, [logout, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <p className="text-sm text-gray-600">Logging out…</p>
    </div>
  );
}
