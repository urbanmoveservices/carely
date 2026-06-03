import {
  IMAGE_EXTENSIONS,
  IMAGE_MIME_TYPES,
} from "./multi-image-constants";

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".docx",
]);

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const DANGEROUS_EXTENSIONS = new Set([
  ".exe", ".bat", ".cmd", ".com", ".msi", ".scr", ".ps1",
  ".vbs", ".js",  ".sh",  ".php", ".py",  ".rb",  ".pl",
]);

export function getMaxUploadBytes(): number {
  const mb = parseInt(process.env.MAX_UPLOAD_MB || "10", 10);
  return mb * 1024 * 1024;
}

export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return "";
  return filename.slice(lastDot).toLowerCase();
}

export function isAllowedExtension(filename: string): boolean {
  return ALLOWED_EXTENSIONS.has(getFileExtension(filename));
}

export function isAllowedMimeType(mime: string): boolean {
  return ALLOWED_MIME_TYPES.has(mime);
}

export function isDangerousExtension(filename: string): boolean {
  return DANGEROUS_EXTENSIONS.has(getFileExtension(filename));
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[/\\:*?"<>|]/g, "_")
    .replace(/\.\./g, "_")
    .replace(/^\.+/, "")
    .trim()
    .slice(0, 200);
}

export function validateUploadFile(
  file: File
): { valid: true } | { valid: false; error: string } {
  if (!file || file.size === 0) {
    return { valid: false, error: "No file provided" };
  }

  if (isDangerousExtension(file.name)) {
    return { valid: false, error: "Executable files are not allowed" };
  }

  if (!isAllowedExtension(file.name)) {
    return {
      valid: false,
      error: "Unsupported file type. Allowed: PDF, JPG, JPEG, PNG, DOCX",
    };
  }

  if (!isAllowedMimeType(file.type)) {
    return {
      valid: false,
      error: "Unsupported MIME type. Allowed: PDF, JPG, JPEG, PNG, DOCX",
    };
  }

  const maxBytes = getMaxUploadBytes();
  if (file.size > maxBytes) {
    const maxMB = maxBytes / (1024 * 1024);
    return { valid: false, error: `File too large. Maximum size is ${maxMB}MB` };
  }

  return { valid: true };
}

export const SUPPORTED_FORMATS_LABEL = "PDF, JPG, JPEG, PNG, WEBP, DOCX";

export function isImageUploadFile(file: File): boolean {
  return (
    IMAGE_MIME_TYPES.has(file.type) || IMAGE_EXTENSIONS.has(getFileExtension(file.name))
  );
}

export function validateImagePageFile(
  file: File
): { valid: true } | { valid: false; error: string; code?: string } {
  if (!file || file.size === 0) {
    return { valid: false, error: "Empty file", code: "UNSUPPORTED_FILE_TYPE" };
  }
  if (isDangerousExtension(file.name)) {
    return { valid: false, error: "Executable files are not allowed", code: "UNSUPPORTED_FILE_TYPE" };
  }
  const ext = getFileExtension(file.name);
  if (!IMAGE_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: "Only JPG, JPEG, PNG, and WEBP images are allowed for multi-page upload",
      code: "UNSUPPORTED_FILE_TYPE",
    };
  }
  if (!IMAGE_MIME_TYPES.has(file.type) && file.type !== "") {
    return {
      valid: false,
      error: "Unsupported image type. Use JPG, PNG, or WEBP",
      code: "UNSUPPORTED_FILE_TYPE",
    };
  }
  const maxBytes = getMaxUploadBytes();
  if (file.size > maxBytes) {
    const maxMB = maxBytes / (1024 * 1024);
    return {
      valid: false,
      error: `Each image must be under ${maxMB}MB`,
      code: "FILE_TOO_LARGE",
    };
  }
  return { valid: true };
}

export function getMaxMultiImageTotalBytes(): number {
  const mb = parseInt(process.env.MAX_MULTI_IMAGE_TOTAL_MB || "30", 10);
  return mb * 1024 * 1024;
}

export function validateMultiImageBatch(
  files: File[]
): { valid: true; totalSize: number } | { valid: false; error: string; code: string } {
  if (files.length === 0) {
    return { valid: false, error: "No images provided", code: "UNSUPPORTED_FILE_TYPE" };
  }
  let totalSize = 0;
  for (const file of files) {
    const v = validateImagePageFile(file);
    if (!v.valid) {
      return { valid: false, error: v.error, code: v.code || "UNSUPPORTED_FILE_TYPE" };
    }
    totalSize += file.size;
  }
  const maxTotal = getMaxMultiImageTotalBytes();
  if (totalSize > maxTotal) {
    const maxMB = maxTotal / (1024 * 1024);
    return {
      valid: false,
      error: `Total upload size exceeds ${maxMB}MB. Remove some pages or use smaller images.`,
      code: "TOTAL_SIZE_TOO_LARGE",
    };
  }
  return { valid: true, totalSize };
}
