"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { adminApi } from "@/lib/admin-api-client";
import type { User } from "@/types";

type TranslationAdminInfo = {
  provider: string;
  isCloud: boolean;
  openAiConfigured: boolean;
  translationModel: string;
  medicalConsentRequired: boolean;
  cacheCount: number;
  supportedLanguages: string[];
};

export default function AdminTranslationPage() {
  return (
    <AdminLayout>
      {(user) => <AdminTranslationContent user={user} />}
    </AdminLayout>
  );
}

function AdminTranslationContent({ user }: { user: User }) {
  const [info, setInfo] = useState<TranslationAdminInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .get<TranslationAdminInfo>("/api/admin/translation")
      .then(setInfo)
      .catch((e: Error) => setError(e.message || "Failed to load"));
  }, []);

  return (
    <div>
      <AdminHeader
        title="Translation"
        description="OpenAI translation provider and cache (read-only)"
        user={user}
      />

      {error && (
        <p className="text-sm text-red-600 mb-4">{error}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>System</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!info ? (
            <p className="text-gray-500">Loading…</p>
          ) : (
            <>
              <p>
                Translation provider:{" "}
                <Badge variant="info">{info.provider}</Badge>
              </p>
              <p>Model: {info.translationModel}</p>
              <p>
                OpenAI configured: {info.openAiConfigured ? "Yes" : "No"}
              </p>
              <p>
                Medical translation requires user consent:{" "}
                {info.medicalConsentRequired ? "Yes" : "No"}
              </p>
              <p>Translation cache entries: {info.cacheCount}</p>
              <p className="text-gray-600 pt-2">
                Supported languages: {info.supportedLanguages.join(", ")}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
