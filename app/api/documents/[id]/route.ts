import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

import { verifyToken, getTokenFromHeader } from "@/lib/jwt";

import { serializeDocumentResponse } from "@/lib/document-serialize";



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

      include: {

        report: { select: { id: true } },

        familyMember: { select: { id: true, fullName: true, relation: true } },

        pages: { orderBy: { pageNumber: "asc" } },

      },

    });



    if (!doc) {

      return NextResponse.json({ error: "Document not found" }, { status: 404 });

    }



    if (doc.userId !== payload.userId) {

      return NextResponse.json({ error: "Access denied" }, { status: 403 });

    }



    return NextResponse.json(serializeDocumentResponse(doc));

  } catch (err) {

    console.error("Document detail error:", err);

    return NextResponse.json(

      { error: "Internal server error" },

      { status: 500 }

    );

  }

}

