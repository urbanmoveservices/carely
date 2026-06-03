import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireFamilyMember } from "@/lib/family-auth";
import { serverError } from "@/lib/api-response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id } = await params;
    const check = await requireFamilyMember(auth.payload.userId, id);
    if ("error" in check) return check.error;

    const documents = await prisma.document.findMany({
      where: { userId: auth.payload.userId, familyMemberId: id },
      orderBy: { createdAt: "desc" },
      include: { report: { select: { id: true } } },
    });

    return NextResponse.json(
      documents.map((d) => ({
        id: d.id,
        original_filename: d.originalFilename,
        file_type: d.fileType,
        file_size: d.fileSize,
        upload_status: d.uploadStatus,
        error_message: d.errorMessage,
        created_at: d.createdAt.toISOString(),
        updated_at: d.updatedAt.toISOString(),
        report_id: d.report?.id || null,
      }))
    );
  } catch (err) {
    console.error("Family member documents error:", err);
    return serverError();
  }
}
