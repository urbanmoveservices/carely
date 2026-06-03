/**
 * Typed access to production-upgrade Prisma delegates.
 * After `npx prisma generate`, these match generated client types.
 */
import prisma from "./prisma";
import type { PrismaClient } from "@prisma/client";

export type PrismaProductionClient = PrismaClient & {
  errorLog: PrismaClient["auditLog"];
  backgroundJob: PrismaClient["auditLog"];
  manualLabValue: PrismaClient["auditLog"];
  chatThread: PrismaClient["auditLog"];
  chatMessage: PrismaClient["auditLog"];
  dataExportRequest: PrismaClient["auditLog"];
  accountDeletionRequest: PrismaClient["auditLog"];
  emailLog: PrismaClient["auditLog"];
  pushSubscription: PrismaClient["auditLog"];
  supportTicket: PrismaClient["auditLog"];
  supportTicketMessage: PrismaClient["auditLog"];
  accessLog: PrismaClient["auditLog"];
  qaChecklistItem: PrismaClient["auditLog"];
};

export const pdb = prisma as unknown as PrismaProductionClient;
