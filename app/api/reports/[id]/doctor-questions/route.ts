import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { forbidden, notFound, serverError } from "@/lib/api-response";
import { generateDoctorQuestions } from "@/lib/doctor-questions";
import {
  resolveReportForUser,
  logReportResolveDev,
} from "@/lib/report-resolve";
import type { AbnormalValue, KeyFinding, RiskFlag } from "@/types";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

function serializeQuestionSet(row: {
  id: string;
  reportId: string;
  summary: string | null;
  questions: unknown;
  aiModelUsed: string | null;
  createdAt: Date;
}) {
  return {
    exists: true,
    id: row.id,
    reportId: row.reportId,
    summary: row.summary,
    questions: row.questions,
    aiModelUsed: row.aiModelUsed,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id: idParam } = await params;

    const resolved = await resolveReportForUser(auth.payload.userId, idParam);
    if (!resolved) {
      logReportResolveDev(idParam, auth.payload.userId, null, null);
      return notFound("Report not found");
    }

    const { report, source } = resolved;
    logReportResolveDev(idParam, auth.payload.userId, source, report.id);

    const langParam = req.nextUrl.searchParams.get("language");
    const pref = await prisma.userPreference.findUnique({
      where: { userId: auth.payload.userId },
      select: { language: true },
    });
    const language = langParam || pref?.language || "en";

    const existing = await prisma.doctorQuestionSet.findFirst({
      where: {
        reportId: report.id,
        userId: auth.payload.userId,
        language,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!existing) {
      return NextResponse.json({
        exists: false,
        reportId: report.id,
        questions: [],
        message: "No doctor questions generated yet.",
      });
    }

    return NextResponse.json(serializeQuestionSet(existing));
  } catch (err) {
    console.error("Doctor questions get error:", err);
    return serverError();
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id: idParam } = await params;
    const force = new URL(req.url).searchParams.get("force") === "true";

    const resolved = await resolveReportForUser(auth.payload.userId, idParam);
    if (!resolved) {
      logReportResolveDev(idParam, auth.payload.userId, null, null);
      return notFound("Report not found");
    }

    const { report, source } = resolved;
    const reportId = report.id;
    logReportResolveDev(idParam, auth.payload.userId, source, reportId);

    const langParam = new URL(req.url).searchParams.get("language");
    const pref = await prisma.userPreference.findUnique({
      where: { userId: auth.payload.userId },
      select: { language: true },
    });
    const language = langParam || pref?.language || "en";

    if (!force) {
      const existing = await prisma.doctorQuestionSet.findFirst({
        where: { reportId, userId: auth.payload.userId, language },
        orderBy: { createdAt: "desc" },
      });
      if (existing) {
        return NextResponse.json(serializeQuestionSet(existing));
      }
    }

    let summaryText = report.summary;
    let keyFindings = report.keyFindings as unknown as KeyFinding[];
    let abnormalValues = report.abnormalValues as unknown as AbnormalValue[];
    let riskFlags = report.riskFlags as unknown as RiskFlag[];

    const fullReport = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (language !== "en" && fullReport) {
      const { translateReportContent } = await import("@/lib/report-translation");
      const tr = await translateReportContent({
        report: fullReport,
        language,
        force: false,
      });
      summaryText = tr.content.summary;
      keyFindings = tr.content.keyFindings;
      abnormalValues = tr.content.abnormalValues;
      riskFlags = tr.content.riskFlags;
    }

    const generated = await generateDoctorQuestions({
      summary: summaryText,
      keyFindings,
      abnormalValues,
      riskFlags,
      filename: report.document.originalFilename,
      language,
    });

    const saved = await prisma.doctorQuestionSet.upsert({
      where: {
        reportId_language: { reportId, language },
      },
      create: {
        userId: auth.payload.userId,
        reportId,
        familyMemberId: report.document.familyMemberId,
        language,
        questions: generated.questions as unknown as Prisma.InputJsonValue,
        summary: generated.summary,
        aiModelUsed: generated.aiModelUsed,
      },
      update: {
        questions: generated.questions as unknown as Prisma.InputJsonValue,
        summary: generated.summary,
        aiModelUsed: generated.aiModelUsed,
      },
    });

    await auditUserAction(
      req,
      auth.payload.userId,
      auth.payload.email,
      AUDIT_ACTIONS.DOCTOR_QUESTIONS_GENERATED,
      {
        entityType: "doctor_question_set",
        entityId: saved.id,
        metadata: { reportId, questionCount: generated.questions.length },
      }
    );

    return NextResponse.json(serializeQuestionSet(saved));
  } catch (err) {
    console.error("Doctor questions generate error:", err);
    return serverError();
  }
}
