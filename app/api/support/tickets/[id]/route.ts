import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/family-auth";
import { ok, notFound, forbidden, serverError } from "@/lib/api-response";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id } = await params;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!ticket) return notFound("Ticket not found");
    if (ticket.userId && ticket.userId !== auth.payload.userId) {
      return forbidden();
    }
    return ok({ ticket });
  } catch (err) {
    console.error("Support ticket GET error:", err);
    return serverError();
  }
}
