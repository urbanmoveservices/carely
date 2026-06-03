import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/family-auth";
import { notFound, serverError } from "@/lib/api-response";
import { buildDoctorPack } from "@/lib/doctor-pack";
import { generateDoctorPackPdf } from "@/lib/pdf-doctor-pack";
import { resolveReportForUser } from "@/lib/report-resolve";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id } = await params;

    const resolved = await resolveReportForUser(auth.payload.userId, id);
    if (!resolved) return notFound("Report not found");

    const pack = await buildDoctorPack(auth.payload.userId, resolved.report.id);
    const pdf = await generateDoctorPackPdf(pack);

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="doctor-pack-${resolved.report.id}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Doctor pack PDF error:", err);
    return serverError();
  }
}
