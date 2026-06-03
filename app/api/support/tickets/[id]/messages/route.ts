import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import {
  ok,
  notFound,
  forbidden,
  validationError,
  serverError,
} from "@/lib/api-response";

const schema = z.object({ message: z.string().min(1).max(5000) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id } = await params;

    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) return notFound("Ticket not found");
    if (ticket.userId && ticket.userId !== auth.payload.userId) {
      return forbidden();
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message || "Invalid input");
    }

    const msg = await prisma.supportTicketMessage.create({
      data: {
        ticketId: id,
        senderId: auth.payload.userId,
        senderRole: "user",
        message: parsed.data.message,
      },
    });

    await prisma.supportTicket.update({
      where: { id },
      data: { updatedAt: new Date(), status: "open" },
    });

    return ok({ message: msg });
  } catch (err) {
    console.error("Ticket message POST error:", err);
    return serverError();
  }
}
