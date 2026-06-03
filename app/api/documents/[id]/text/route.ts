import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { id } = await params;

    const doc = await prisma.document.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        originalFilename: true,
        extractedText: true,
        uploadStatus: true,
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (doc.userId !== payload.userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!doc.extractedText) {
      return NextResponse.json(
        { error: "No extracted text available" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: doc.id,
      original_filename: doc.originalFilename,
      extracted_text: doc.extractedText,
      upload_status: doc.uploadStatus,
    });
  } catch (err) {
    console.error("Document text error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
