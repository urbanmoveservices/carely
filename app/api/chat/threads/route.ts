import { NextRequest } from "next/server";

import { z } from "zod";

import { requireAuth } from "@/lib/family-auth";

import { ok, serverError, validationError } from "@/lib/api-response";

import { createChatThread, listChatThreads } from "@/lib/ai/ask-chat";

import { logChatError } from "@/lib/chat/safe-log";

import { handleChatRouteError } from "@/lib/chat/chat-errors";



const createSchema = z.object({

  type: z.enum(["general", "report", "family"]),

  reportId: z.string().optional(),

  familyMemberId: z.string().optional(),

  title: z.string().max(120).optional(),

});



export async function GET(req: NextRequest) {

  try {

    const auth = await requireAuth(req);

    if ("error" in auth) return auth.error;



    const { searchParams } = new URL(req.url);

    const type = searchParams.get("type");

    const reportId = searchParams.get("reportId") || undefined;

    const familyMemberId = searchParams.get("familyMemberId") || undefined;



    const filters: {

      type?: "general" | "report" | "family";

      reportId?: string;

      familyMemberId?: string;

    } = {};



    if (type === "general" || type === "report" || type === "family") {

      filters.type = type;

    }

    if (reportId) filters.reportId = reportId;

    if (familyMemberId) filters.familyMemberId = familyMemberId;



    const threads = await listChatThreads(auth.payload.userId, filters);

    return ok({ threads });

  } catch (err) {

    logChatError("chat_threads_list", err);

    return handleChatRouteError(err);

  }

}



export async function POST(req: NextRequest) {

  try {

    const auth = await requireAuth(req);

    if ("error" in auth) return auth.error;



    const body = await req.json();

    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {

      return validationError(parsed.error.issues[0]?.message || "Invalid input");

    }



    const thread = await createChatThread({

      userId: auth.payload.userId,

      type: parsed.data.type,

      reportId: parsed.data.reportId,

      familyMemberId: parsed.data.familyMemberId,

      title: parsed.data.title,

    });



    return ok({ thread });

  } catch (err) {

    logChatError("chat_threads_create", err);

    return handleChatRouteError(err);

  }

}

