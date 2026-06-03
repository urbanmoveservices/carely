import { serializeDocumentPages } from "@/lib/multi-image-document";

export function serializeDocumentResponse(
  doc: {
    id: string;
    originalFilename: string;
    fileType: string;
    fileSize: number;
    uploadMode?: string | null;
    pageCount?: number | null;
    uploadStatus: string;
    errorMessage: string | null;
    extractedText: string | null;
    createdAt: Date;
    updatedAt: Date;
    report?: { id: string } | null;
    familyMember?: {
      id: string;
      fullName: string;
      relation: string;
    } | null;
    pages?: Array<{
      id: string;
      pageNumber: number;
      originalFilename: string;
      mimeType: string;
      fileSize: number;
      ocrStatus: string;
      errorMessage: string | null;
      extractedText: string | null;
    }>;
  }
) {
  const pages = doc.pages ? serializeDocumentPages(doc.pages) : undefined;
  const failedPageCount = pages?.filter((p) => p.ocr_status === "failed").length ?? 0;

  return {
    id: doc.id,
    original_filename: doc.originalFilename,
    file_type: doc.fileType,
    file_size: doc.fileSize,
    upload_mode: doc.uploadMode ?? "single",
    page_count: doc.pageCount ?? 1,
    upload_status: doc.uploadStatus,
    error_message: doc.errorMessage,
    extracted_text_preview: doc.extractedText
      ? doc.extractedText.slice(0, 500)
      : null,
    extracted_text_length: doc.extractedText?.length ?? 0,
    created_at: doc.createdAt.toISOString(),
    updated_at: doc.updatedAt.toISOString(),
    report_id: doc.report?.id ?? null,
    family_member: doc.familyMember
      ? {
          id: doc.familyMember.id,
          fullName: doc.familyMember.fullName,
          relation: doc.familyMember.relation,
        }
      : null,
    pages,
    failed_page_count: failedPageCount,
  };
}
