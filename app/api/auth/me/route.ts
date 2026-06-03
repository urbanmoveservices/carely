import { NextRequest } from "next/server";

import prisma from "@/lib/prisma";

import { verifyToken, getTokenFromHeader } from "@/lib/jwt";

import { serializeUser } from "@/lib/user-serialize";

import { unauthorized, serverError, ok } from "@/lib/api-response";



export async function GET(req: NextRequest) {

  try {

    const token = getTokenFromHeader(req.headers.get("authorization"));

    if (!token) return unauthorized();



    const payload = verifyToken(token);

    if (!payload) return unauthorized("Invalid token");



    const user = await prisma.user.findUnique({

      where: { id: payload.userId },

    });



    if (!user) return unauthorized("User not found");



    return ok(serializeUser(user));

  } catch (err) {

    console.error("Me error:", err);

    return serverError();

  }

}

