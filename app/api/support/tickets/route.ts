import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { ok, validationError, serverError } from "@/lib/api-response";

const createSchema = z.object({
  category: z.string().min(1).max(60),
  subject: z.string().min(3).max(200),
  message: z.string().min(5).max(5000),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const tickets = await prisma.supportTicket.findMany({
      where: { userId: auth.payload.userId },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
    return ok({ tickets });
  } catch (err) {
    console.error("Support tickets GET error:", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message || "Invalid input");
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: auth.payload.userId,
        category: parsed.data.category,
        subject: parsed.data.subject,
        priority: parsed.data.priority || "normal",
        messages: {
          create: {
            senderId: auth.payload.userId,
            senderRole: "user",
            message: parsed.data.message,
          },
        },
      },
      include: { messages: true },
    });

    return ok({ ticket });
  } catch (err) {
    console.error("Support tickets POST error:", err);
    return serverError();
  }
}
