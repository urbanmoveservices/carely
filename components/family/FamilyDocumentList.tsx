"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatBytes, formatDate } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/constants";
import type { FamilyDocument } from "@/types";
import { FileText, Sparkles, Eye, GitCompare } from "lucide-react";

export function FamilyDocumentList({ memberId }: { memberId: string }) {
  const [docs, setDocs] = useState<FamilyDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getFamilyMemberDocuments(memberId)
      .then(setDocs)
      .finally(() => setLoading(false));
  }, [memberId]);

  if (loading) return <p className="text-sm text-gray-500">Loading reports…</p>;
  if (docs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500 mb-4">No linked reports yet.</p>
        <Link href={`/upload?familyMemberId=${memberId}`}>
          <Button size="sm">Upload report</Button>
        </Link>
      </div>
    );
  }

  const completedCount = docs.filter((d) => d.report_id).length;

  return (
    <div className="space-y-3">
      {completedCount >= 2 && (
        <Link href={`/family/${memberId}/compare-reports`}>
          <Button variant="outline" size="sm" className="w-full min-h-[44px]">
            <GitCompare className="h-4 w-4" /> Compare Reports
          </Button>
        </Link>
      )}
    <ul className="space-y-3">
      {docs.map((d) => (
        <li
          key={d.id}
          className="rounded-xl border border-gray-100 bg-white p-4"
        >
          <div className="flex gap-3">
            <FileText className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900 truncate">
                {d.original_filename}
              </p>
              <p className="text-xs text-gray-500">
                {formatBytes(d.file_size)} · {formatDate(d.created_at)}
              </p>
              <Badge variant="default" className="mt-1">
                {STATUS_LABELS[d.upload_status as keyof typeof STATUS_LABELS] ||
                  d.upload_status}
              </Badge>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/documents/${d.id}`}>
                  <Button variant="outline" size="sm" className="min-h-[40px]">
                    <Eye className="h-4 w-4" /> View text
                  </Button>
                </Link>
                {d.report_id ? (
                  <Link href={`/reports/${d.report_id}`}>
                    <Button size="sm" className="min-h-[40px]">
                      <Sparkles className="h-4 w-4" /> View report
                    </Button>
                  </Link>
                ) : (
                  <Link href={`/documents/${d.id}`}>
                    <Button size="sm" variant="outline" className="min-h-[40px]">
                      Generate summary
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
    </div>
  );
}
