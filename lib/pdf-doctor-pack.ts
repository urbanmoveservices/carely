import { buildDoctorPack } from "./doctor-pack";
import { drawPdfBrandLogo } from "@/lib/pdf-brand";

type Pack = Awaited<ReturnType<typeof buildDoctorPack>>;

export async function generateDoctorPackPdf(pack: Pack): Promise<Buffer> {
  const { loadPdfDocumentConstructor } = await import("@/lib/pdfkit-document");
  const PDFDocument = await loadPdfDocumentConstructor();

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 60, left: 50, right: 50 },
    });

    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    drawPdfBrandLogo(doc, { width: 44, y: doc.page.margins.top });
    doc.fontSize(18).fillColor("#0d9488").text("Doctor Visit Pack", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#6b7280").text(pack.disclaimer, { align: "center" });
    doc.moveDown(1);

    if (pack.patient) {
      doc.fontSize(12).fillColor("#111827").text(`Patient: ${pack.patient.name} (${pack.patient.relation})`);
    }
    doc.text(`Report date: ${new Date(pack.report.date).toLocaleDateString()}`);
    doc.text(`File: ${pack.report.filename}`);
    doc.moveDown(0.5);

    doc.fontSize(14).text("Summary");
    doc.fontSize(10).fillColor("#374151").text(pack.report.summary.slice(0, 2500), {
      align: "left",
    });
    doc.moveDown(0.5);

    if (pack.healthRisks.length > 0) {
      doc.fontSize(14).fillColor("#111827").text("Health risks");
      pack.healthRisks.slice(0, 8).forEach((r) => {
        doc.fontSize(10).text(`• [${r.level}] ${r.title}: ${r.message.slice(0, 200)}`);
      });
      doc.moveDown(0.5);
    }

    doc.fontSize(14).text("Questions for your doctor");
    pack.questionsForDoctor.forEach((q) => {
      doc.fontSize(10).text(`• ${q}`);
    });

    doc.end();
  });
}
