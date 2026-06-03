import { NextRequest } from "next/server";
import { readdir, rm } from "fs/promises";
import path from "path";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api-response";
import { auditAdminAction, AUDIT_ACTIONS } from "@/lib/audit-log";

function getUploadRoot(): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), process.env.LOCAL_UPLOAD_DIR || "storage/uploads");
}

async function listDirsRecursive(dir: string, depth = 0): Promise<string[]> {
  const results: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const full = path.join(dir, entry.name);
        if (depth >= 1) {
          results.push(full);
        } else {
          const children = await listDirsRecursive(full, depth + 1);
          results.push(...children);
        }
      }
    }
  } catch {
    // directory may not exist
  }
  return results;
}

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") return forbidden("Admin access required");

    let dryRun = true;
    try {
      const body = await req.json();
      if (body.dryRun === false) dryRun = false;
    } catch {
      // no body means dry run
    }

    const uploadRoot = getUploadRoot();
    const docDirs = await listDirsRecursive(uploadRoot);

    const documents = await prisma.document.findMany({
      where: { storagePath: { not: null } },
      select: { storagePath: true },
    });

    const knownPaths = new Set(
      documents
        .map((d) => d.storagePath ? path.resolve(path.dirname(d.storagePath)) : null)
        .filter(Boolean) as string[]
    );

    const orphaned: string[] = [];
    for (const dir of docDirs) {
      if (!knownPaths.has(path.resolve(dir))) {
        orphaned.push(dir);
      }
    }

    let deletedCount = 0;
    if (!dryRun) {
      for (const dir of orphaned) {
        try {
          await rm(dir, { recursive: true, force: true });
          deletedCount++;
        } catch {
          // skip if deletion fails
        }
      }

      await auditAdminAction(req, payload.userId, payload.email, AUDIT_ACTIONS.ADMIN_CLEANUP_FILES, {
        metadata: { orphanedCount: orphaned.length, deletedCount },
      });
    }

    return ok({
      dryRun,
      orphanedFiles: orphaned.map((p) => path.relative(uploadRoot, p)),
      deletedCount: dryRun ? 0 : deletedCount,
    });
  } catch (err) {
    console.error("Cleanup files error:", err);
    return serverError();
  }
}
