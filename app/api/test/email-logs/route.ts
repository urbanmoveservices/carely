import { NextRequest } from "next/server";
import { ok, forbidden, serverError } from "@/lib/api-response";
import prisma from "@/lib/prisma";

/** E2E only — email logs for @vaidya.test users */
export async function GET(req: NextRequest) {
  if (
    process.env.E2E_ALLOW_TEST_HELPERS !== "true" ||
    process.env.NODE_ENV === "production"
  ) {
    return forbidden("Not available");
  }

  try {
    const email = req.nextUrl.searchParams.get("email")?.toLowerCase();
    if (!email?.endsWith("@vaidya.test")) {
      return forbidden("Test emails only");
    }

    const logs = await prisma.emailLog.findMany({
      where: { to: email },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        subject: true,
        type: true,
        templateKey: true,
        category: true,
        status: true,
        createdAt: true,
      },
    });
    return ok({ logs });
  } catch (err) {
    console.error("Test email logs:", err);
    return serverError();
  }
}
