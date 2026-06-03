"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { MobileShell } from "@/components/MobileShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { SearchResultList } from "@/components/search/SearchResultList";
import { api } from "@/lib/api-client";
import type { SearchResponse, FamilyMember } from "@/types";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_CHIPS = [
  { id: "all", label: "All" },
  { id: "reports", label: "Reports" },
  { id: "family", label: "Family" },
  { id: "medications", label: "Meds" },
  { id: "vitals", label: "Vitals" },
  { id: "appointments", label: "Visits" },
  { id: "reminders", label: "Reminders" },
];

function SearchPageContent() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") || "";

  const [q, setQ] = useState(initialQ);
  const [type, setType] = useState("all");
  const [familyMemberId, setFamilyMemberId] = useState("");
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getFamilyMembers().then(setMembers).catch(() => {});
  }, []);

  const runSearch = useCallback(() => {
    if (!q.trim()) {
      setData(null);
      return;
    }
    setLoading(true);
    const p = new URLSearchParams();
    p.set("q", q.trim());
    p.set("type", type);
    if (familyMemberId) p.set("familyMemberId", familyMemberId);
    api
      .searchAll(p.toString())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [q, type, familyMemberId]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (q.trim().length >= 2) runSearch();
    }, 400);
    return () => clearTimeout(t);
  }, [q, type, familyMemberId, runSearch]);

  useEffect(() => {
    if (initialQ) runSearch();
  }, [initialQ, runSearch]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Search</h1>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search reports, family, meds, vitals…"
          className="pl-10 min-h-[48px]"
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
        />
      </div>

      <div className="flex gap-1 overflow-x-auto scrollbar-none mb-3">
        {TYPE_CHIPS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setType(c.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-2 text-xs font-medium min-h-[40px]",
              type === c.id ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-700"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <select
        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm mb-4 min-h-[44px]"
        value={familyMemberId}
        onChange={(e) => setFamilyMemberId(e.target.value)}
      >
        <option value="">All family members</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.fullName}
          </option>
        ))}
      </select>

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      )}

      {!loading && data && <SearchResultList results={data.results} />}

      {!loading && q.trim() && data?.total === 0 && (
        <p className="text-center text-gray-500 py-12 text-sm">No results found</p>
      )}

      {!q.trim() && (
        <p className="text-center text-gray-400 py-12 text-sm">
          Type at least 2 characters to search your health data.
        </p>
      )}
    </main>
  );
}

export default function SearchPage() {
  return (
    <ProtectedRoute>
      <MobileShell>
        <AppHeader />
        <Suspense fallback={<div className="p-4">Loading…</div>}>
          <SearchPageContent />
        </Suspense>
      </MobileShell>
    </ProtectedRoute>
  );
}
