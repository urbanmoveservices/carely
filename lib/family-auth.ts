import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import type { JwtPayload } from "@/types";
import { unauthorized, forbidden, notFound } from "@/lib/api-response";

export function getAuthPayload(req: NextRequest): JwtPayload | null {
  const token = getTokenFromHeader(req.headers.get("authorization"));
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth(req: NextRequest) {
  const token = getTokenFromHeader(req.headers.get("authorization"));
  if (!token) return { error: unauthorized() };
  const payload = verifyToken(token);
  if (!payload) return { error: unauthorized("Invalid token") };
  return { payload };
}

export async function requireFamilyMember(
  userId: string,
  memberId: string
) {
  const member = await prisma.familyMember.findUnique({
    where: { id: memberId },
  });
  if (!member) return { error: notFound("Family member not found") as Response };
  if (member.userId !== userId) return { error: forbidden() as Response };
  return { member };
}
