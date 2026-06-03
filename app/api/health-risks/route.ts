import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/family-auth";

import { queryHealthRisks } from "@/lib/health-risks-query";

import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

import {

  getStaleClientWarning,

  hasHealthRiskDelegate,

  warnMissingDelegate,

} from "@/lib/prisma-delegate-guards";



const EMPTY_RESPONSE = {

  cards: [],

  stats: { total: 0, critical: 0, warning: 0, info: 0 },

};



export async function GET(req: NextRequest) {

  try {

    const auth = await requireAuth(req);

    if ("error" in auth) return auth.error;



    if (!hasHealthRiskDelegate()) {

      warnMissingDelegate("healthRisk");

      return NextResponse.json({

        ...EMPTY_RESPONSE,

        warning:

          getStaleClientWarning() ||

          "Health risks unavailable until Prisma client is regenerated.",

      });

    }



    const url = new URL(req.url);

    const familyMemberId = url.searchParams.get("familyMemberId");

    const category = url.searchParams.get("category");

    const level = url.searchParams.get("level");

    const status = url.searchParams.get("status") || "active";

    const source = url.searchParams.get("source");

    const reportId = url.searchParams.get("reportId");

    const limitRaw = url.searchParams.get("limit");

    const limit = limitRaw ? Math.min(parseInt(limitRaw, 10) || 100, 200) : 100;



    const data = await queryHealthRisks({

      userId: auth.payload.userId,

      familyMemberId: familyMemberId || undefined,

      category: category || undefined,

      level: level || undefined,

      status,

      source: source || undefined,

      reportId: reportId || undefined,

      limit,

    });



    await auditUserAction(req, auth.payload.userId, auth.payload.email, AUDIT_ACTIONS.HEALTH_RISKS_VIEWED, {

      metadata: {

        cardCount: data.cards.length,

        familyMemberId: familyMemberId || null,

        category,

        level,

        status,

      },

    });



    return NextResponse.json({

      cards: data.cards,

      stats: data.stats,

      ...(data.warning ? { warning: data.warning } : {}),

    });

  } catch (err) {

    console.error("Health risks error:", err);

    return NextResponse.json({

      ...EMPTY_RESPONSE,

      warning:

        process.env.NODE_ENV !== "production"

          ? "Health risks query failed. Run npx prisma generate and restart dev server."

          : undefined,

    });

  }

}

