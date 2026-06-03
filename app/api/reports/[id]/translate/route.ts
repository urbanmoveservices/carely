import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { resolveReportForUser } from "@/lib/report-resolve";
import {
  ok,
  unauthorized,
  notFound,
  validationError,
  serverError,
} from "@/lib/api-response";
import { isSupportedLanguage, DEFAULT_LANGUAGE } from "@/lib/i18n/languages";
import { translateReportContent } from "@/lib/report-translation";
import {
  getUserAllowCloudTranslation,
  AI_TRANSLATION_CONSENT_REQUIRED,
} from "@/lib/translation/service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();

    const payload = verifyToken(token);
    if (!payload) return unauthorized("Invalid token");

    const { id } = await params;
    let body: { language?: string; force?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const language = body.language || DEFAULT_LANGUAGE;
    if (!isSupportedLanguage(language)) {
      return validationError("Unsupported language");
    }

    const resolved = await resolveReportForUser(payload.userId, id);
    if (!resolved) return notFound("Report not found");

    const report = await prisma.report.findUnique({
      where: { id: resolved.report.id },
    });
    if (!report) return notFound("Report not found");

    const allowCloud = await getUserAllowCloudTranslation(payload.userId);

    if (language !== DEFAULT_LANGUAGE && !allowCloud) {
      return NextResponse.json(
        {
          error: AI_TRANSLATION_CONSENT_REQUIRED,
          code: "AI_TRANSLATION_CONSENT_REQUIRED",
        },
        { status: 403 }
      );
    }

    const result = await translateReportContent({
      report,
      language,
      force: body.force === true,
      allowCloud,
    });

    return ok({
      reportId: report.id,
      language,
      sourceLanguage: DEFAULT_LANGUAGE,
      translated: result.translated,
      fromCache: result.fromCache,
      partial: result.partial ?? false,
      warning: result.warning,
      aiModelUsed: result.aiModelUsed,
      content: result.content,
    });
  } catch (err) {
    console.error("Report translate POST error:", err);
    return serverError();
  }
}
