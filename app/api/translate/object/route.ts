import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { requireAuth } from "@/lib/family-auth";

import { serverError, validationError } from "@/lib/api-response";

import { isSupportedLanguage } from "@/lib/i18n/languages";

import {

  getUserAllowCloudTranslation,

  AI_TRANSLATION_CONSENT_REQUIRED,

} from "@/lib/translation/service";

import { translateObject } from "@/lib/translation/translate-object";



const schema = z.object({

  data: z.unknown(),

  targetLanguage: z.string().max(10),

  sourceLanguage: z.string().max(10).optional(),

  context: z.enum(["medical_report", "general", "legal"]).optional(),

});



export async function POST(req: NextRequest) {

  try {

    const auth = await requireAuth(req);

    if ("error" in auth) return auth.error;



    const body = await req.json();

    const parsed = schema.safeParse(body);

    if (!parsed.success) {

      return validationError(parsed.error.issues[0]?.message || "Invalid input");

    }



    if (!isSupportedLanguage(parsed.data.targetLanguage)) {

      return validationError("Unsupported language");

    }



    const context = parsed.data.context ?? "medical_report";

    const allowCloud = await getUserAllowCloudTranslation(auth.payload.userId);



    try {

      const translated = await translateObject({

        data: parsed.data.data as Record<string, unknown>,

        targetLanguage: parsed.data.targetLanguage,

        sourceLanguage: parsed.data.sourceLanguage,

        allowCloud,

        context,

      });



      return NextResponse.json({

        data: translated,

        targetLanguage: parsed.data.targetLanguage,

        provider: "openai",

      });

    } catch (err: unknown) {

      const code = (err as { code?: string })?.code;

      if (code === "TRANSLATION_NOT_CONFIGURED") {

        return NextResponse.json(

          {

            error: "OpenAI translation is not configured.",

            code: "TRANSLATION_NOT_CONFIGURED",

          },

          { status: 503 }

        );

      }

      if (code === "AI_TRANSLATION_CONSENT_REQUIRED") {

        return NextResponse.json(

          {

            error: AI_TRANSLATION_CONSENT_REQUIRED,

            code: "AI_TRANSLATION_CONSENT_REQUIRED",

            data: parsed.data.data,

          },

          { status: 403 }

        );

      }

      throw err;

    }

  } catch (err) {

    console.error("Translate object error:", err);

    return serverError();

  }

}

