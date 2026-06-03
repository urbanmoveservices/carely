import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/family-auth";

import { serverError } from "@/lib/api-response";

import { getTranslationCacheStats } from "@/lib/translation/cache";

import {

  getTranslationProviderStatus,

  getUserAllowCloudTranslation,

} from "@/lib/translation/service";

import { SUPPORTED_TRANSLATION_LANGUAGE_CODES } from "@/lib/translation/language-map";



export async function GET(req: NextRequest) {

  try {

    const auth = await requireAuth(req);

    if ("error" in auth) return auth.error;



    const status = getTranslationProviderStatus();

    const cache = await getTranslationCacheStats();

    const allowCloudTranslation = await getUserAllowCloudTranslation(

      auth.payload.userId

    );



    return NextResponse.json({

      ...status,

      cacheCount: cache.count,

      allowCloudTranslation,

      supportedLanguages: SUPPORTED_TRANSLATION_LANGUAGE_CODES,

    });

  } catch (err) {

    console.error("Translate status error:", err);

    return serverError();

  }

}

