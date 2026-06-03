import { NextRequest, NextResponse } from "next/server";
import type { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuth, requireFamilyMember } from "@/lib/family-auth";
import { unauthorized, validationError, serverError, notFound } from "@/lib/api-response";
import { auditUserAction } from "@/lib/audit-log";
import { parseDateField } from "@/lib/family-schemas";

type PrismaDelegate = {
  findMany: (args: unknown) => Promise<unknown[]>;
  findFirst: (args: unknown) => Promise<unknown | null>;
  create: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
  delete: (args: unknown) => Promise<unknown>;
};

export function createSubresourceRoutes<T extends Record<string, unknown>>(config: {
  delegate: () => PrismaDelegate;
  createSchema: z.ZodType<T>;
  patchSchema: z.ZodType<Partial<T>>;
  serialize: (row: Record<string, unknown>) => Record<string, unknown>;
  buildCreateData: (
    userId: string,
    familyMemberId: string,
    data: T
  ) => Record<string, unknown>;
  buildUpdateData: (data: Partial<T>) => Record<string, unknown>;
  auditAdded: string;
  auditUpdated: string;
  auditDeleted: string;
  entityType: string;
}) {
  const getDelegate = config.delegate;

  async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    try {
      const auth = await requireAuth(req);
      if ("error" in auth) return auth.error;
      const { id } = await params;
      const check = await requireFamilyMember(auth.payload.userId, id);
      if ("error" in check) return check.error;

      const rows = (await getDelegate().findMany({
        where: { userId: auth.payload.userId, familyMemberId: id },
        orderBy: { createdAt: "desc" },
      })) as Record<string, unknown>[];

      return NextResponse.json(rows.map(config.serialize));
    } catch (err) {
      console.error(config.entityType, "list error:", err);
      return serverError();
    }
  }

  async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    try {
      const auth = await requireAuth(req);
      if ("error" in auth) return auth.error;
      const { id } = await params;
      const check = await requireFamilyMember(auth.payload.userId, id);
      if ("error" in check) return check.error;

      const body = await req.json();
      const parsed = config.createSchema.safeParse(body);
      if (!parsed.success) {
        return validationError(parsed.error.issues[0]?.message || "Invalid input");
      }

      const row = (await getDelegate().create({
        data: config.buildCreateData(
          auth.payload.userId,
          id,
          parsed.data as T
        ),
      })) as Record<string, unknown>;

      await auditUserAction(req, auth.payload.userId, auth.payload.email, config.auditAdded, {
        entityType: config.entityType,
        entityId: row.id as string,
        metadata: { familyMemberId: id, status: row.status as string | undefined },
      });

      return NextResponse.json(config.serialize(row), { status: 201 });
    } catch (err) {
      console.error(config.entityType, "create error:", err);
      return serverError();
    }
  }

  return { GET, POST };
}

export function createSubresourceItemRoutes<T extends Record<string, unknown>>(config: {
  delegate: () => PrismaDelegate;
  idParam: string;
  patchSchema: z.ZodType<Partial<T>>;
  serialize: (row: Record<string, unknown>) => Record<string, unknown>;
  buildUpdateData: (data: Partial<T>) => Record<string, unknown>;
  auditUpdated: string;
  auditDeleted: string;
  entityType: string;
}) {
  const getDelegate = config.delegate;

  async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<Record<string, string>> }
  ) {
    try {
      const auth = await requireAuth(req);
      if ("error" in auth) return auth.error;
      const p = await params;
      const memberId = p.id;
      const itemId = p[config.idParam];
      const check = await requireFamilyMember(auth.payload.userId, memberId);
      if ("error" in check) return check.error;

      const existing = (await getDelegate().findFirst({
        where: {
          id: itemId,
          userId: auth.payload.userId,
          familyMemberId: memberId,
        },
      })) as Record<string, unknown> | null;
      if (!existing) return notFound();

      const body = await req.json();
      const parsed = config.patchSchema.safeParse(body);
      if (!parsed.success) {
        return validationError(parsed.error.issues[0]?.message || "Invalid input");
      }

      const row = (await getDelegate().update({
        where: { id: itemId },
        data: config.buildUpdateData(parsed.data as Partial<T>),
      })) as Record<string, unknown>;

      await auditUserAction(req, auth.payload.userId, auth.payload.email, config.auditUpdated, {
        entityType: config.entityType,
        entityId: itemId,
        metadata: { familyMemberId: memberId },
      });

      return NextResponse.json(config.serialize(row));
    } catch (err) {
      console.error(config.entityType, "update error:", err);
      return serverError();
    }
  }

  async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<Record<string, string>> }
  ) {
    try {
      const auth = await requireAuth(req);
      if ("error" in auth) return auth.error;
      const p = await params;
      const memberId = p.id;
      const itemId = p[config.idParam];
      const check = await requireFamilyMember(auth.payload.userId, memberId);
      if ("error" in check) return check.error;

      const existing = await getDelegate().findFirst({
        where: {
          id: itemId,
          userId: auth.payload.userId,
          familyMemberId: memberId,
        },
      });
      if (!existing) return notFound();

      await getDelegate().delete({ where: { id: itemId } });

      await auditUserAction(req, auth.payload.userId, auth.payload.email, config.auditDeleted, {
        entityType: config.entityType,
        entityId: itemId,
        metadata: { familyMemberId: memberId },
      });

      return NextResponse.json({ success: true });
    } catch (err) {
      console.error(config.entityType, "delete error:", err);
      return serverError();
    }
  }

  return { PATCH, DELETE };
}

export { parseDateField };
