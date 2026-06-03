import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { isFileEncryptionConfigured, isProduction } from "@/lib/env";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;

function getKey(): Buffer | null {
  const raw = process.env.FILE_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  if (raw.length === 64 && /^[0-9a-f]+$/i.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  return scryptSync(raw, "carely-med-salt", 32);
}

export type EncryptedPayload = {
  ciphertext: Buffer;
  iv: string;
  tag: string;
};

export function canEncryptUploads(): boolean {
  return isFileEncryptionConfigured();
}

export function requireEncryptionForUpload(): void {
  if (isProduction() && !isFileEncryptionConfigured()) {
    throw new Error(
      "FILE_ENCRYPTION_KEY is required for uploads in production"
    );
  }
}

export function encryptBuffer(plain: Buffer): EncryptedPayload {
  const key = getKey();
  if (!key) {
    return {
      ciphertext: plain,
      iv: "",
      tag: "",
    };
  }
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: encrypted,
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
  };
}

export function decryptBuffer(
  ciphertext: Buffer,
  ivHex: string | null | undefined,
  tagHex: string | null | undefined
): Buffer {
  const key = getKey();
  if (!key || !ivHex || !tagHex) return ciphertext;
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
