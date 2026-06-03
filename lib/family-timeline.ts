import prisma from "@/lib/prisma";
import { hasFamilyTimelineEventDelegate } from "@/lib/prisma-delegate-guards";

export interface TimelineItem {
  id: string;
  type: string;
  title: string;
  subtitle?: string | null;
  status?: string | null;
  occurredAt: string;
  entityId?: string;
  reportId?: string | null;
}

export async function buildFamilyTimeline(
  userId: string,
  familyMemberId: string
): Promise<TimelineItem[]> {
  const items: TimelineItem[] = [];

  const [documents, conditions, allergies, medications, vitals, appointments, dbEvents] =
    await Promise.all([
      prisma.document.findMany({
        where: { userId, familyMemberId },
        include: { report: { select: { id: true, createdAt: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.healthCondition.findMany({
        where: { userId, familyMemberId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.allergy.findMany({
        where: { userId, familyMemberId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.medication.findMany({
        where: { userId, familyMemberId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.vitalRecord.findMany({
        where: { userId, familyMemberId },
        orderBy: { measuredAt: "desc" },
      }),
      prisma.appointment.findMany({
        where: { userId, familyMemberId },
        orderBy: { appointmentAt: "desc" },
      }),
      hasFamilyTimelineEventDelegate()
        ? prisma.familyTimelineEvent.findMany({
            where: { userId, familyMemberId },
            orderBy: { occurredAt: "desc" },
            take: 50,
          })
        : Promise.resolve([]),
    ]);

  for (const d of documents) {
    items.push({
      id: `doc-${d.id}`,
      type: "document_uploaded",
      title: d.originalFilename,
      subtitle: d.uploadStatus,
      status: d.uploadStatus,
      occurredAt: d.createdAt.toISOString(),
      entityId: d.id,
      reportId: d.report?.id || null,
    });
    if (d.report) {
      items.push({
        id: `report-${d.report.id}`,
        type: "report_generated",
        title: "AI report generated",
        subtitle: d.originalFilename,
        occurredAt: d.report.createdAt.toISOString(),
        entityId: d.report.id,
        reportId: d.report.id,
      });
    }
  }

  for (const c of conditions) {
    items.push({
      id: `cond-${c.id}`,
      type: "condition_added",
      title: c.name,
      subtitle: c.status,
      status: c.status,
      occurredAt: c.createdAt.toISOString(),
      entityId: c.id,
    });
  }

  for (const a of allergies) {
    items.push({
      id: `allergy-${a.id}`,
      type: "allergy_added",
      title: a.name,
      subtitle: a.severity,
      status: a.severity,
      occurredAt: a.createdAt.toISOString(),
      entityId: a.id,
    });
  }

  for (const m of medications) {
    items.push({
      id: `med-${m.id}`,
      type: "medication_started",
      title: m.name,
      subtitle: m.dosage || m.frequency,
      status: m.status,
      occurredAt: (m.startDate || m.createdAt).toISOString(),
      entityId: m.id,
    });
  }

  for (const v of vitals) {
    items.push({
      id: `vital-${v.id}`,
      type: "vital_added",
      title: v.label,
      subtitle: v.valueText || (v.value != null ? `${v.value} ${v.unit || ""}`.trim() : null),
      status: v.type,
      occurredAt: v.measuredAt.toISOString(),
      entityId: v.id,
    });
  }

  for (const a of appointments) {
    items.push({
      id: `appt-${a.id}`,
      type: "appointment_created",
      title: a.title,
      subtitle: a.doctorName || a.hospitalName,
      status: a.status,
      occurredAt: a.appointmentAt.toISOString(),
      entityId: a.id,
    });
  }

  for (const e of dbEvents) {
    items.push({
      id: `evt-${e.id}`,
      type: e.type,
      title: e.title,
      subtitle: e.description,
      occurredAt: e.occurredAt.toISOString(),
      entityId: e.reportId || e.documentId || e.id,
      reportId: e.reportId,
    });
  }

  items.sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );

  return items;
}
