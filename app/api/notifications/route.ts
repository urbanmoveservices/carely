import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

import { requireAuth } from "@/lib/family-auth";

import { getUnreadNotificationCount } from "@/lib/app-notifications";

import {

  getStaleClientWarning,

  hasAppNotificationDelegate,

  warnMissingDelegate,

} from "@/lib/prisma-delegate-guards";



export async function GET(req: NextRequest) {

  const auth = await requireAuth(req);

  if ("error" in auth) return auth.error;



  if (!hasAppNotificationDelegate()) {

    warnMissingDelegate("appNotification");

    return NextResponse.json({

      items: [],

      unreadCount: 0,

      warning:

        getStaleClientWarning() ||

        "Notifications unavailable until Prisma client is regenerated.",

    });

  }



  try {

    const url = new URL(req.url);

    const unreadOnly = url.searchParams.get("unreadOnly") === "true";

    const limit = Math.min(parseInt(url.searchParams.get("limit") || "30", 10) || 30, 100);



    const where: { userId: string; isRead?: boolean } = {

      userId: auth.payload.userId,

    };

    if (unreadOnly) where.isRead = false;



    const [items, unreadCount] = await Promise.all([

      prisma.appNotification.findMany({

        where,

        orderBy: { createdAt: "desc" },

        take: limit,

      }),

      getUnreadNotificationCount(auth.payload.userId),

    ]);



    return NextResponse.json({

      items: items.map((n) => ({

        id: n.id,

        type: n.type,

        title: n.title,

        message: n.message,

        href: n.href,

        isRead: n.isRead,

        createdAt: n.createdAt.toISOString(),

      })),

      unreadCount,

    });

  } catch (err) {

    console.error("Notifications error:", err);

    return NextResponse.json({ items: [], unreadCount: 0 });

  }

}

