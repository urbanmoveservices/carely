declare module "pdf-parse" {
  interface PDFData {
    numpages: number;
    numrender: number;
    info: Record<string, any>;
    metadata: any;
    text: string;
    version: string;
  }
  function pdfParse(buffer: Buffer): Promise<PDFData>;
  export = pdfParse;
}

declare module "pdf-parse/lib/pdf-parse.js" {
  interface PDFData {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: unknown;
    text: string;
    version: string;
  }
  function pdfParse(
    buffer: Buffer,
    options?: { max?: number }
  ): Promise<PDFData>;
  export = pdfParse;
}
