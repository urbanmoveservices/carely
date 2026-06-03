import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import {
  ok,
  unauthorized,
  forbidden,
  notFound,
  validationError,
  serverError,
} from "@/lib/api-response";
import prisma from "@/lib/prisma";

const patchSchema = z.object({
  status: z.enum(["open", "pending", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  reply: z.string().max(5000).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();
    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return forbidden("Admin access required");
    }

    const { id } = await params;
    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) return notFound("Ticket not found");

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message || "Invalid input");
    }

    if (parsed.data.reply) {
      await prisma.supportTicketMessage.create({
        data: {
          ticketId: id,
          senderId: payload.userId,
          senderRole: "admin",
          message: parsed.data.reply,
        },
      });
    }

    const updated = await prisma.supportTicket.update({
      where: { id },
      data: {
        status: parsed.data.status,
        priority: parsed.data.priority,
        updatedAt: new Date(),
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    return ok({ ticket: updated });
  } catch (err) {
    console.error("Admin ticket PATCH error:", err);
    return serverError();
  }
}
