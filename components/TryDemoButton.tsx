"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { setToken } from "@/lib/auth-client";
import { Button } from "./ui/Button";
import { Play } from "lucide-react";

export function TryDemoButton({
  variant = "outline",
  className,
}: {
  variant?: "primary" | "outline";
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDemo = async () => {
    setLoading(true);
    try {
      const data = await api.demoLogin();
      setToken(data.access_token);
      window.location.href = "/dashboard";
    } catch (e: unknown) {
      alert(
        e instanceof Error
          ? e.message
          : "Demo login failed. Run npm run demo:seed first."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant === "primary" ? "primary" : "outline"}
      onClick={handleDemo}
      loading={loading}
      className={className}
    >
      <Play className="h-4 w-4" />
      Try Demo
    </Button>
  );
}
