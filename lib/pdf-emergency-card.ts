export interface EmergencyCardPdfData {
  fullName: string;
  relation: string;
  bloodGroup: string | null;
  allergies: { name: string; severity?: string | null }[];
  medications: { name: string; dosage?: string | null }[];
  conditions: { name: string; status: string }[];
  contacts: { name: string; phone: string; relation?: string | null }[];
}

import { drawPdfBrandLogo } from "@/lib/pdf-brand";

const DISCLAIMER =
  "Emergency information card — for informational use only. Not a substitute for professional medical care. " +
  "Verify details with your healthcare provider.";

export async function generateEmergencyCardPdf(
  data: EmergencyCardPdfData
): Promise<Buffer> {
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

    drawPdfBrandLogo(doc, { width: 40, y: doc.page.margins.top });
    doc.fontSize(20).fillColor("#0d9488").text("Emergency Health Card", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(14).fillColor("#111827").text(data.fullName, { align: "center" });
    doc.fontSize(11).fillColor("#6b7280").text(data.relation, { align: "center" });
    if (data.bloodGroup) {
      doc.text(`Blood group: ${data.bloodGroup}`, { align: "center" });
    }
    doc.moveDown(1);

    const section = (title: string, lines: string[]) => {
      if (lines.length === 0) return;
      doc.fontSize(12).fillColor("#0d9488").text(title);
      doc.fontSize(10).fillColor("#374151");
      lines.forEach((l) => doc.text(`• ${l}`));
      doc.moveDown(0.5);
    };

    section(
      "Allergies",
      data.allergies.map((a) => `${a.name}${a.severity ? ` (${a.severity})` : ""}`)
    );
    section(
      "Active Medications",
      data.medications.map((m) => `${m.name}${m.dosage ? ` — ${m.dosage}` : ""}`)
    );
    section(
      "Conditions",
      data.conditions.map((c) => `${c.name} (${c.status})`)
    );
    section(
      "Emergency Contacts",
      data.contacts.map((c) => `${c.name}: ${c.phone}${c.relation ? ` (${c.relation})` : ""}`)
    );

    doc.moveDown(1);
    doc.fontSize(8).fillColor("#9ca3af").text(DISCLAIMER, { align: "center" });
    doc.end();
  });
}
