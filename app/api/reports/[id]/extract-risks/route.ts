import { NextRequest } from "next/server";

import prisma from "@/lib/prisma";

import { requireAuth } from "@/lib/family-auth";

import { ok, notFound, fail } from "@/lib/api-response";

import { rerunPostProcessingForReport } from "@/lib/rerun-report-post-processing";

import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

import { isPostProcessingSchemaReady } from "@/lib/prisma-delegate-guards";



export async function POST(

  req: NextRequest,

  { params }: { params: Promise<{ id: string }> }

) {

  const auth = await requireAuth(req);

  if ("error" in auth) return auth.error;



  if (!isPostProcessingSchemaReady()) {

    return fail(

      "Post-processing tables are not available. Run migration and generate Prisma client, then restart dev server.",

      503,

      "POST_PROCESSING_SCHEMA_NOT_READY"

    );

  }



  const { id: reportId } = await params;



  const report = await prisma.report.findFirst({

    where: { id: reportId, userId: auth.payload.userId },

    select: { id: true, documentId: true },

  });

  if (!report) return notFound("Report not found");



  try {

    const result = await rerunPostProcessingForReport(auth.payload.userId, reportId);

    if (!result) {

      return fail("Report is not ready for risk extraction.", 400, "REPORT_NOT_READY");

    }



    await auditUserAction(

      req,

      auth.payload.userId,

      auth.payload.email,

      AUDIT_ACTIONS.HEALTH_RISKS_EXTRACTED_FROM_REPORT,

      {

        entityType: "report",

        entityId: reportId,

        metadata: {

          documentId: report.documentId,

          healthRisksCreated: result.healthRisksCreated,

        },

      }

    );



    await auditUserAction(

      req,

      auth.payload.userId,

      auth.payload.email,

      AUDIT_ACTIONS.REPORT_POST_PROCESSING_COMPLETED,

      {

        entityType: "report",

        entityId: reportId,

        metadata: result,

      }

    );



    return ok({ success: true, report_id: reportId, postProcessing: result });

  } catch (err) {

    console.error("Extract risks error:", err);

    return fail(

      "Post-processing could not complete. Ensure Prisma migration and generate have been run.",

      503,

      "POST_PROCESSING_SCHEMA_NOT_READY"

    );

  }

}

