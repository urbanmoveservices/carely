import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { ok, unauthorized, forbidden, serverError, rateLimited } from "@/lib/api-response";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") return forbidden("Admin access required");

    const rl = checkRateLimit("admin-api", payload.userId, RATE_LIMITS.ADMIN_API);
    if (!rl.allowed) return rateLimited();

    const documents = await prisma.document.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        report: { select: { id: true } },
        familyMember: { select: { id: true, fullName: true, relation: true } },
      },
    });

    const withPages = await Promise.all(
      documents.map(async (d) => {
        const failedPageCount =
          d.uploadMode === "multi_image"
            ? await prisma.documentPage.count({
                where: { documentId: d.id, ocrStatus: "failed" },
              })
            : 0;
        return { d, failedPageCount };
      })
    );

    return ok(
      withPages.map(({ d, failedPageCount }) => ({
        id: d.id,
        originalFilename: d.originalFilename,
        fileType: d.fileType,
        fileSize: d.fileSize,
        uploadMode: d.uploadMode ?? "single",
        pageCount: d.pageCount ?? 1,
        failedPageCount,
        uploadStatus: d.uploadStatus,
        errorMessage: d.errorMessage,
        extractedTextLength: d.extractedText ? d.extractedText.length : 0,
        createdAt: d.createdAt.toISOString(),
        user: d.user,
        reportId: d.report?.id || null,
        familyMember: d.familyMember
          ? { id: d.familyMember.id, fullName: d.familyMember.fullName, relation: d.familyMember.relation }
          : null,
      }))
    );
  } catch (err) {
    console.error("Admin documents error:", err);
    return serverError();
  }
}
