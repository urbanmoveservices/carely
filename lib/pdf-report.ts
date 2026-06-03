import { drawPdfBrandLogo } from "@/lib/pdf-brand";
import { BRAND, MEDICAL_DISCLAIMER } from "@/lib/brand";
import { loadPdfDocumentConstructor } from "@/lib/pdfkit-document";
import { normalizeReportForPdf } from "@/lib/report-data-normalize";
import type {
  KeyFinding,
  AbnormalValue,
  RiskFlag,
  ChartDataPoint,
  ContextualInsight,
} from "@/types";

export interface ReportPdfData {
  id: string;
  createdAt: string;
  healthScore?: number;
  summary: unknown;
  keyFindings: unknown;
  abnormalValues: unknown;
  foodRecommendations: unknown;
  exerciseRecommendations: unknown;
  lifestyleAdvice: unknown;
  riskFlags: unknown;
  chartData: unknown;
  contextualInsights?: unknown;
  document: {
    originalFilename: string;
    fileType: string;
  };
  aiModelUsed?: string;
  processingTimeMs?: number | null;
  user?: {
    name: string;
    email: string;
  };
}

const TEAL = "#0d9488";
const DARK = "#111827";
const GRAY = "#6b7280";
const LIGHT_GRAY = "#9ca3af";
const RED = "#ef4444";
const ORANGE = "#f59e0b";

const DEFAULT_DISCLAIMER = MEDICAL_DISCLAIMER;

export interface PdfLabels {
  disclaimer: string;
  summary: string;
  keyFindings: string;
  abnormalValues: string;
  food: string;
  exercise: string;
  lifestyle: string;
  riskFlags: string;
  healthScore: string;
  aiSummary: string;
  healthMetrics: string;
  contextInsights?: string;
}

export async function generateReportPdf(params: {
  report: ReportPdfData;
  generatedFor: "user" | "admin";
  labels?: PdfLabels;
}): Promise<Buffer> {
  const PDFDocument = await loadPdfDocumentConstructor();
  const { report: rawReport, generatedFor } = params;
  const normalized = normalizeReportForPdf(rawReport);
  const document = rawReport.document ?? {
    originalFilename: "Medical report",
    fileType: "unknown",
  };
  const report = {
    ...rawReport,
    ...normalized,
    healthScore: normalized.healthScore ?? undefined,
    document,
  };
  const labels = params.labels ?? {
    disclaimer: DEFAULT_DISCLAIMER,
    summary: "AI Summary",
    keyFindings: "Key Findings",
    abnormalValues: "Abnormal Values",
    food: "Food Recommendations",
    exercise: "Exercise Recommendations",
    lifestyle: "Lifestyle Advice",
    riskFlags: "Risk Flags",
    healthScore: "Health Score",
    aiSummary: "AI Summary",
    healthMetrics: "Health Metrics",
  };

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 60, left: 50, right: 50 },
      bufferPages: true,
      info: {
        Title: `AI Medical Report - ${report.document.originalFilename}`,
        Author: BRAND.name,
        Creator: BRAND.name,
      },
    });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    let currentY = doc.y;

    function checkPage(needed: number) {
      const bottom = doc.page.height - doc.page.margins.bottom;
      if (doc.y + needed > bottom) {
        doc.addPage();
      }
    }

    function sectionTitle(title: string) {
      checkPage(40);
      doc.moveDown(0.8);
      doc
        .fontSize(13)
        .fillColor(TEAL)
        .text(title, { underline: false });
      doc
        .moveTo(doc.x, doc.y + 2)
        .lineTo(doc.x + pageWidth, doc.y + 2)
        .strokeColor(TEAL)
        .lineWidth(0.5)
        .stroke();
      doc.moveDown(0.5);
    }

    // ── Header ──
    drawPdfBrandLogo(doc, { width: 44, y: doc.page.margins.top });
    doc
      .fontSize(20)
      .fillColor(TEAL)
      .text(BRAND.name, { align: "center" });
    doc
      .fontSize(8)
      .fillColor(GRAY)
      .text(`Operated by ${BRAND.operator}`, { align: "center" });
    doc
      .fontSize(12)
      .fillColor(DARK)
      .text("AI Medical Summary Report", { align: "center" });
    doc.moveDown(0.3);
    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .strokeColor(TEAL)
      .lineWidth(1)
      .stroke();
    doc.moveDown(0.8);

    // ── Report Metadata ──
    const meta = [
      ["Report ID", report.id],
      ["Document", report.document.originalFilename],
      ["Generated", new Date(report.createdAt).toLocaleString()],
    ];
    if (generatedFor === "admin" && report.user) {
      meta.push(["User", `${report.user.name} (${report.user.email})`]);
    }

    for (const [label, value] of meta) {
      doc
        .fontSize(9)
        .fillColor(GRAY)
        .text(`${label}: `, { continued: true })
        .fillColor(DARK)
        .text(String(value));
    }
    doc.moveDown(0.5);

    // ── Disclaimer ──
    checkPage(60);
    doc
      .roundedRect(doc.x, doc.y, pageWidth, 50, 4)
      .fillAndStroke("#fef2f2", "#fecaca");
    doc
      .fontSize(7.5)
      .fillColor("#991b1b")
      .text("IMPORTANT DISCLAIMER", doc.x + 10, doc.y - 44, {
        width: pageWidth - 20,
      });
    doc
      .fontSize(7)
      .fillColor("#7f1d1d")
      .text(labels.disclaimer, { width: pageWidth - 20 });
    doc.moveDown(1);

    // ── Health Score ──
    if (report.healthScore != null) {
      sectionTitle(labels.healthScore);
      doc
        .fontSize(28)
        .fillColor(
          report.healthScore >= 80
            ? "#16a34a"
            : report.healthScore >= 60
            ? "#ca8a04"
            : RED
        )
        .text(`${report.healthScore}`, { continued: true })
        .fontSize(12)
        .fillColor(GRAY)
        .text(" / 100");
      doc
        .fontSize(7.5)
        .fillColor(LIGHT_GRAY)
        .text(
          "This score is an AI-generated clinical estimate to support diagnosis and treatment planning."
        );
      doc.moveDown(0.3);
    }

    // ── Summary ──
    sectionTitle(labels.aiSummary);
    doc.fontSize(9.5).fillColor(DARK).text(report.summary, {
      lineGap: 3,
      width: pageWidth,
    });

    if (report.contextualInsights && report.contextualInsights.length > 0) {
      sectionTitle(labels.contextInsights || "Context-Based Insights");
      doc
        .fontSize(7.5)
        .fillColor(GRAY)
        .text("Lifestyle and medical context was user-provided.");
      doc.moveDown(0.3);
      for (const insight of report.contextualInsights) {
        checkPage(40);
        doc
          .fontSize(9)
          .fillColor(DARK)
          .text(`${insight.title}: `, { continued: true })
          .fillColor(GRAY)
          .text(insight.message, { width: pageWidth });
        doc.moveDown(0.2);
      }
    }

    // ── Key Findings ──
    if (report.keyFindings.length > 0) {
      sectionTitle(`${labels.keyFindings} (${report.keyFindings.length})`);
      for (const f of report.keyFindings) {
        checkPage(50);
        const status = f.status || "unknown";
        const statusLabel = status.toUpperCase();
        const statusColor =
          status === "critical" || status === "high"
            ? RED
            : status === "low"
            ? "#3b82f6"
            : status === "normal"
            ? "#16a34a"
            : GRAY;

        doc
          .fontSize(9.5)
          .fillColor(DARK)
          .text(`${f.title}: `, { continued: true })
          .font("Helvetica-Bold")
          .text(f.value, { continued: true })
          .font("Helvetica")
          .fillColor(statusColor)
          .text(`  [${statusLabel}]`);
        doc
          .fontSize(8)
          .fillColor(GRAY)
          .text(f.explanation, { width: pageWidth });
        doc.moveDown(0.3);
      }
    }

    // ── Abnormal Values ──
    if (report.abnormalValues.length > 0) {
      sectionTitle(`${labels.abnormalValues} (${report.abnormalValues.length})`);
      for (const a of report.abnormalValues) {
        checkPage(55);
        const severity = a.severity || "unknown";
        const sevColor =
          severity === "critical" || severity === "high"
            ? RED
            : severity === "moderate"
            ? ORANGE
            : GRAY;

        doc
          .fontSize(9.5)
          .fillColor(DARK)
          .font("Helvetica-Bold")
          .text(a.name || "Marker", { continued: true })
          .font("Helvetica")
          .text(`: ${a.value || "—"}`, { continued: true })
          .fillColor(LIGHT_GRAY)
          .text(`  (Normal: ${a.normalRange || "—"})`, { continued: true })
          .fillColor(sevColor)
          .text(`  [${severity.toUpperCase()}]`);
        doc
          .fontSize(8)
          .fillColor(GRAY)
          .text(a.meaning, { width: pageWidth });
        doc.moveDown(0.3);
      }
    }

    // ── Recommendations ──
    const recSections: [string, string[]][] = [
      [labels.food, report.foodRecommendations],
      [labels.exercise, report.exerciseRecommendations],
      [labels.lifestyle, report.lifestyleAdvice],
    ];

    for (const [title, items] of recSections) {
      if (items.length === 0) continue;
      sectionTitle(title);
      for (const item of items) {
        checkPage(20);
        doc
          .fontSize(9)
          .fillColor(DARK)
          .text(`•  ${item}`, { indent: 10, width: pageWidth - 10 });
        doc.moveDown(0.15);
      }
    }

    // ── Risk Flags ──
    if (report.riskFlags.length > 0) {
      sectionTitle(`${labels.riskFlags} (${report.riskFlags.length})`);
      for (const flag of report.riskFlags) {
        checkPage(25);
        const level = flag.level || "info";
        const icon =
          level === "critical" ? "[!]" : level === "warning" ? "[!]" : "[i]";
        const color =
          level === "critical" ? RED : level === "warning" ? ORANGE : "#3b82f6";

        doc
          .fontSize(9)
          .fillColor(color)
          .text(`${icon} [${level.toUpperCase()}] `, { continued: true })
          .fillColor(DARK)
          .text(flag.message || "Flag noted in report.", { width: pageWidth });
        doc.moveDown(0.2);
      }
    }

    // ── Chart Data Table ──
    if (report.chartData.length > 0) {
      sectionTitle(`${labels.healthMetrics} Data`);

      const colWidths = [pageWidth * 0.28, pageWidth * 0.16, pageWidth * 0.18, pageWidth * 0.18, pageWidth * 0.2];
      const headers = ["Metric", "Value", "Normal Min", "Normal Max", "Unit"];
      const startX = doc.x;

      checkPage(25 + report.chartData.length * 18);

      // Header row
      let cx = startX;
      doc.fontSize(8).fillColor(TEAL).font("Helvetica-Bold");
      for (let i = 0; i < headers.length; i++) {
        doc.text(headers[i], cx, doc.y, { width: colWidths[i], continued: false });
        cx += colWidths[i];
      }
      doc.font("Helvetica");
      doc.moveDown(0.2);
      doc
        .moveTo(startX, doc.y)
        .lineTo(startX + pageWidth, doc.y)
        .strokeColor("#e5e7eb")
        .lineWidth(0.5)
        .stroke();
      doc.moveDown(0.2);

      // Data rows
      for (const c of report.chartData) {
        checkPage(18);
        cx = startX;
        const rowY = doc.y;
        const values = [
          c.label,
          String(c.value),
          c.normalMin != null ? String(c.normalMin) : "—",
          c.normalMax != null ? String(c.normalMax) : "—",
          c.unit || "—",
        ];
        doc.fontSize(8).fillColor(DARK);
        for (let i = 0; i < values.length; i++) {
          doc.text(values[i], cx, rowY, { width: colWidths[i] });
          cx += colWidths[i];
        }
        doc.moveDown(0.15);
      }
    }

    // ── Footer on each page ──
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      const bottom = doc.page.height - 30;
      doc
        .fontSize(7)
        .fillColor(LIGHT_GRAY)
        .text(
          `Generated by ${BRAND.name}`,
          doc.page.margins.left,
          bottom,
          { width: pageWidth / 2, align: "left" }
        );
      doc.text(
        `Page ${i + 1} of ${pages.count}`,
        doc.page.margins.left + pageWidth / 2,
        bottom,
        { width: pageWidth / 2, align: "right" }
      );
    }

    doc.end();
  });
}
