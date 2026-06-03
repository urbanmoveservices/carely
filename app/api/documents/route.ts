import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const documents = await prisma.document.findMany({
      where: { userId: payload.userId },
      orderBy: { createdAt: "desc" },
      include: {
        report: { select: { id: true } },
        familyMember: { select: { id: true, fullName: true, relation: true } },
      },
    });

    const result = documents.map((doc) => ({
      id: doc.id,
      original_filename: doc.originalFilename,
      file_type: doc.fileType,
      file_size: doc.fileSize,
      upload_status: doc.uploadStatus,
      error_message: doc.errorMessage,
      created_at: doc.createdAt.toISOString(),
      updated_at: doc.updatedAt.toISOString(),
      report_id: doc.report?.id || null,
      family_member: doc.familyMember
        ? { id: doc.familyMember.id, fullName: doc.familyMember.fullName, relation: doc.familyMember.relation }
        : null,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("Documents error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
