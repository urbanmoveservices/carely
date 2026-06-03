import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

import { requireAuth } from "@/lib/family-auth";

import {

  getStaleClientWarning,

  hasReminderSuggestionDelegate,

  warnMissingDelegate,

} from "@/lib/prisma-delegate-guards";



export async function GET(req: NextRequest) {

  const auth = await requireAuth(req);

  if ("error" in auth) return auth.error;



  if (!hasReminderSuggestionDelegate()) {

    warnMissingDelegate("reminderSuggestion");

    return NextResponse.json({

      items: [],

      total: 0,

      warning:

        getStaleClientWarning() ||

        "Reminder suggestions unavailable until Prisma client is regenerated.",

    });

  }



  try {

    const url = new URL(req.url);

    const familyMemberId = url.searchParams.get("familyMemberId");

    const reportId = url.searchParams.get("reportId");

    const status = url.searchParams.get("status") || "pending";

    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 50);



    const where: Record<string, unknown> = {

      userId: auth.payload.userId,

      status,

    };

    if (familyMemberId) where.familyMemberId = familyMemberId;

    if (reportId) where.reportId = reportId;



    const items = await prisma.reminderSuggestion.findMany({

      where,

      orderBy: { createdAt: "desc" },

      take: limit,

    });



    return NextResponse.json({

      items: items.map((s) => ({

        id: s.id,

        type: s.type,

        title: s.title,

        message: s.message,

        suggestedDate: s.suggestedDate?.toISOString() || null,

        status: s.status,

        reportId: s.reportId,

        documentId: s.documentId,

        familyMemberId: s.familyMemberId,

        createdAt: s.createdAt.toISOString(),

      })),

      total: items.length,

    });

  } catch (err) {

    console.error("Reminder suggestions error:", err);

    return NextResponse.json({ items: [], total: 0 });

  }

}

