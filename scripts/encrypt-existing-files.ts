import prisma from "../lib/prisma";
import { readFile, writeFile } from "fs/promises";
import { encryptBuffer } from "../lib/encryption/file-encryption";
import { isFileEncryptionConfigured } from "../lib/env";

async function main() {
  if (!isFileEncryptionConfigured()) {
    console.error("FILE_ENCRYPTION_KEY is not set");
    process.exit(1);
  }

  const docs = await prisma.document.findMany({
    where: { storagePath: { not: null }, isEncrypted: false },
    take: 100,
  });

  let count = 0;
  for (const doc of docs) {
    if (!doc.storagePath) continue;
    try {
      const raw = await readFile(doc.storagePath);
      const enc = encryptBuffer(raw);
      if (!enc.iv || !enc.tag) continue;
      await writeFile(doc.storagePath, enc.ciphertext);
      await prisma.document.update({
        where: { id: doc.id },
        data: {
          isEncrypted: true,
          encryptionIv: enc.iv,
          encryptionTag: enc.tag,
          storageVersion: "v1-encrypted",
        },
      });
      count += 1;
      console.log(`Encrypted document ${doc.id}`);
    } catch (err) {
      console.warn(`Skip ${doc.id}:`, err);
    }
  }

  console.log(`Done. Encrypted ${count} file(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
