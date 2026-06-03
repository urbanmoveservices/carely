import { NextRequest, NextResponse } from "next/server";

import { verifyToken, getTokenFromHeader } from "@/lib/jwt";

import { unauthorized, forbidden, serverError } from "@/lib/api-response";

import { getTranslationCacheStats } from "@/lib/translation/cache";

import { getTranslationProviderStatus } from "@/lib/translation/service";

import { SUPPORTED_TRANSLATION_LANGUAGE_CODES } from "@/lib/translation/language-map";



export async function GET(req: NextRequest) {

  try {

    const token = getTokenFromHeader(req.headers.get("authorization"));

    if (!token) return unauthorized();



    const payload = verifyToken(token);

    if (!payload || payload.role !== "admin") {

      return forbidden("Admin access required");

    }



    const status = getTranslationProviderStatus();

    const cache = await getTranslationCacheStats();



    return NextResponse.json({

      ...status,

      cacheCount: cache.count,

      supportedLanguages: SUPPORTED_TRANSLATION_LANGUAGE_CODES,

    });

  } catch (err) {

    console.error("Admin translation status error:", err);

    return serverError();

  }

}

