import { PrismaClient } from "@prisma/client";

/** Extends client after production_non_payment_upgrade migration + generate */
export type AppPrismaClient = PrismaClient & {
  errorLog: any;
  backgroundJob: any;
  manualLabValue: any;
  chatThread: any;
  chatMessage: any;
  dataExportRequest: any;
  accountDeletionRequest: any;
  emailLog: any;
  pushSubscription: any;
  supportTicket: any;
  supportTicketMessage: any;
  accessLog: any;
  qaChecklistItem: any;
  emailOtp: any;
};

/** Fields added by multi_image_upload_pages migration (use until prisma generate) */
export type DocumentMultiImageFields = {
  uploadMode?: string | null;
  pageCount?: number | null;
  combinedTextLength?: number | null;
};

const globalForPrisma = globalThis as unknown as { prisma: AppPrismaClient };

const prismaInstance = globalForPrisma.prisma || new PrismaClient();

export const prisma = prismaInstance as AppPrismaClient;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
