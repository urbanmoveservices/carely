"use client";

import { Alert } from "@/components/ui/Alert";
import { useTranslation } from "@/lib/i18n/use-translation";

export function ChatSafetyNotice({
  level,
}: {
  level: "normal" | "caution" | "urgent";
}) {
  const { t } = useTranslation();

  if (level !== "urgent") return null;

  return (
    <Alert variant="error" className="text-sm mb-3">
      {t("chat.emergencyNotice")}
    </Alert>
  );
}
