import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/family-auth";
import { performSearch, type SearchType } from "@/lib/search-service";
import { serverError } from "@/lib/api-response";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

const VALID_TYPES = [
  "all", "documents", "reports", "family", "conditions",
  "medications", "appointments", "reminders", "vitals",
];

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const type = (searchParams.get("type") || "all") as SearchType;
    const familyMemberId = searchParams.get("familyMemberId") || undefined;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const data = await performSearch({
      userId: auth.payload.userId,
      q,
      type,
      familyMemberId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit,
    });

    await auditUserAction(req, auth.payload.userId, auth.payload.email, AUDIT_ACTIONS.SEARCH_PERFORMED, {
      entityType: "search",
      metadata: {
        typeFilter: type,
        resultCount: data.total,
        queryLength: q.length,
      },
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error("Search error:", err);
    return serverError();
  }
}
