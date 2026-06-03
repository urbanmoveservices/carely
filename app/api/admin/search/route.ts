import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { ok, unauthorized, forbidden, serverError, rateLimited } from "@/lib/api-response";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

function contains(q: string) {
  return { contains: q, mode: "insensitive" as const };
}

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();
    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") return forbidden("Admin access required");
    const rl = checkRateLimit("admin-api", payload.userId, RATE_LIMITS.ADMIN_API);
    if (!rl.allowed) return rateLimited();

    const q = (new URL(req.url).searchParams.get("q") || "").trim();
    const limit = 15;
    if (!q) {
      return ok({
        query: q,
        results: { users: [], documents: [], reports: [], familyMembers: [], reminders: [] },
        total: 0,
      });
    }

    const [users, documents, reports, familyMembers, reminders] = await Promise.all([
      prisma.user.findMany({
        where: { OR: [{ name: contains(q) }, { email: contains(q) }] },
        take: limit,
        select: { id: true, name: true, email: true, role: true },
      }),
      prisma.document.findMany({
        where: { originalFilename: contains(q) },
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          familyMember: { select: { id: true, fullName: true, relation: true } },
        },
      }),
      prisma.report.findMany({
        where: { summary: contains(q) },
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          document: { select: { id: true, originalFilename: true } },
        },
      }),
      prisma.familyMember.findMany({
        where: { OR: [{ fullName: contains(q) }, { relation: contains(q) }] },
        take: limit,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.reminder.findMany({
        where: { OR: [{ title: contains(q) }, { description: contains(q) }] },
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          familyMember: { select: { id: true, fullName: true } },
        },
      }),
    ]);

    const results = {
      users: users.map((u) => ({
        id: u.id,
        title: u.name,
        subtitle: u.email,
        href: `/admin/users/${u.id}`,
        badge: u.role,
      })),
      documents: documents.map((d) => ({
        id: d.id,
        title: d.originalFilename,
        subtitle: d.user.name,
        href: `/admin/documents`,
        date: d.createdAt.toISOString(),
      })),
      reports: reports.map((r) => ({
        id: r.id,
        title: r.document.originalFilename,
        subtitle: r.user.name,
        href: `/admin/reports/${r.id}`,
        date: r.createdAt.toISOString(),
      })),
      familyMembers: familyMembers.map((m) => ({
        id: m.id,
        title: m.fullName,
        subtitle: `${m.relation} · ${m.user.name}`,
        href: `/admin/users/${m.user.id}`,
      })),
      reminders: reminders.map((r) => ({
        id: r.id,
        title: r.title,
        subtitle: r.user.name,
        href: `/admin/reminders`,
        badge: r.status,
      })),
    };

    const total = Object.values(results).reduce((s, arr) => s + arr.length, 0);
    return ok({ query: q, results, total });
  } catch (err) {
    console.error("Admin search error:", err);
    return serverError();
  }
}
