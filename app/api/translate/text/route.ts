import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { requireAuth } from "@/lib/family-auth";

import { serverError, validationError } from "@/lib/api-response";

import { isSupportedLanguage } from "@/lib/i18n/languages";

import {

  getUserAllowCloudTranslation,

  translateTextWithCache,

  AI_TRANSLATION_CONSENT_REQUIRED,

} from "@/lib/translation/service";



const schema = z.object({

  text: z.string().max(5000),

  targetLanguage: z.string().max(10),

  sourceLanguage: z.string().max(10).optional(),

  context: z.enum(["ui", "medical_report", "legal", "general"]).optional(),

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



    const context = parsed.data.context ?? "general";

    const allowCloud = await getUserAllowCloudTranslation(auth.payload.userId);



    try {

      const result = await translateTextWithCache({

        text: parsed.data.text,

        targetLanguage: parsed.data.targetLanguage,

        sourceLanguage: parsed.data.sourceLanguage,

        allowCloud,

        context,

      });



      return NextResponse.json({

        translatedText: result.translatedText,

        targetLanguage: parsed.data.targetLanguage,

        cached: result.cached,

        provider: result.provider,

        warning: result.warning,

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

            translatedText: parsed.data.text,

            targetLanguage: parsed.data.targetLanguage,

            cached: false,

            provider: "openai",

          },

          { status: 403 }

        );

      }

      throw err;

    }

  } catch (err) {

    console.error("Translate text error:", err);

    return serverError();

  }

}

