import { mkdir, writeFile, rm, access, readFile } from "fs/promises";

import path from "path";

import { sanitizeFilename } from "./file-validation";

import {

  canEncryptUploads,

  decryptBuffer,

  encryptBuffer,

  requireEncryptionForUpload,

} from "./encryption/file-encryption";



function getUploadRoot(): string {

  return path.join(

    /* turbopackIgnore: true */ process.cwd(),

    process.env.LOCAL_UPLOAD_DIR || "storage/uploads"

  );

}



function buildDocumentDir(userId: string, documentId: string): string {

  const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, "");

  const safeDoc = documentId.replace(/[^a-zA-Z0-9_-]/g, "");

  return path.join(getUploadRoot(), safeUser, safeDoc);

}



export async function saveDocumentPageFile(
  buffer: Buffer,
  originalFilename: string,
  userId: string,
  documentId: string,
  pageNumber: number
): Promise<{
  storagePath: string;
  isEncrypted: boolean;
  encryptionIv: string | null;
  encryptionTag: string | null;
}> {
  const dir = path.join(buildDocumentDir(userId, documentId), "pages");
  await mkdir(dir, { recursive: true });
  const safeName = sanitizeFilename(originalFilename);
  const filePath = path.join(dir, `page-${pageNumber}-${safeName}`);
  const resolved = path.resolve(filePath);
  const pagesRoot = path.resolve(path.join(buildDocumentDir(userId, documentId), "pages"));
  if (!resolved.startsWith(pagesRoot)) {
    throw new Error("Invalid storage path");
  }
  const encrypted = encryptBuffer(buffer);
  const useEncryption = canEncryptUploads() && encrypted.iv && encrypted.tag;
  await writeFile(filePath, encrypted.ciphertext);
  return {
    storagePath: filePath,
    isEncrypted: Boolean(useEncryption),
    encryptionIv: useEncryption ? encrypted.iv : null,
    encryptionTag: useEncryption ? encrypted.tag : null,
  };
}

export async function saveUploadedFile(

  buffer: Buffer,

  originalFilename: string,

  userId: string,

  documentId: string

): Promise<{

  storagePath: string;

  isEncrypted: boolean;

  encryptionIv: string | null;

  encryptionTag: string | null;

}> {

  requireEncryptionForUpload();



  const dir = buildDocumentDir(userId, documentId);

  await mkdir(dir, { recursive: true });



  const safeName = sanitizeFilename(originalFilename);

  const filePath = path.join(dir, safeName);



  const resolved = path.resolve(filePath);

  if (!resolved.startsWith(path.resolve(getUploadRoot()))) {

    throw new Error("Invalid storage path");

  }



  const encrypted = encryptBuffer(buffer);

  const useEncryption = canEncryptUploads() && encrypted.iv && encrypted.tag;



  await writeFile(filePath, encrypted.ciphertext);



  return {

    storagePath: filePath,

    isEncrypted: Boolean(useEncryption),

    encryptionIv: useEncryption ? encrypted.iv : null,

    encryptionTag: useEncryption ? encrypted.tag : null,

  };

}



export async function readStoredFile(

  storagePath: string,

  encryption?: {

    isEncrypted?: boolean;

    encryptionIv?: string | null;

    encryptionTag?: string | null;

  }

): Promise<Buffer> {

  const raw = await readFile(storagePath);

  if (encryption?.isEncrypted && encryption.encryptionIv && encryption.encryptionTag) {

    return decryptBuffer(raw, encryption.encryptionIv, encryption.encryptionTag);

  }

  return raw;

}



export async function deleteStoredFile(storagePath: string): Promise<void> {

  if (!storagePath) return;



  try {

    await access(storagePath);

  } catch {

    return;

  }



  const dir = path.dirname(storagePath);

  const uploadRoot = path.resolve(getUploadRoot());



  if (!path.resolve(dir).startsWith(uploadRoot)) {

    return;

  }



  try {

    await rm(dir, { recursive: true, force: true });

  } catch {

    try {

      await rm(storagePath, { force: true });

    } catch {

      // file already gone

    }

  }

}



export function getStorageRootPath(): string {

  return getUploadRoot();

}


