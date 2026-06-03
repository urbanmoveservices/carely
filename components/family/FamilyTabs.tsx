"use client";

import { useState, useEffect } from "react";
import type { FamilyMemberDetail, Reminder } from "@/types";
import { ConditionList } from "./ConditionList";
import { AllergyList } from "./AllergyList";
import { MedicationList } from "./MedicationList";
import { VitalsList } from "./VitalsList";
import { AppointmentList } from "./AppointmentList";
import { EmergencyContactList } from "./EmergencyContactList";
import { EmergencyCardPanel } from "./EmergencyCardPanel";
import { FamilyTimeline } from "./FamilyTimeline";
import { FamilyDocumentList } from "./FamilyDocumentList";
import { FamilyRemindersList } from "./FamilyRemindersList";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Upload, Activity, Pill, Calendar, GitCompare, ShieldAlert } from "lucide-react";
import { FamilyMemberRisksPanel } from "./FamilyMemberRisksPanel";
import { FamilyMemberLabTrendsPanel } from "./FamilyMemberLabTrendsPanel";
import { FamilyMemberFollowupsPanel } from "./FamilyMemberFollowupsPanel";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "risks", label: "Health Risks" },
  { id: "reports", label: "Reports" },
  { id: "timeline", label: "Timeline" },
  { id: "labtrends", label: "Lab Trends" },
  { id: "followups", label: "Follow-ups" },
  { id: "vitals", label: "Vitals" },
  { id: "medications", label: "Meds" },
  { id: "conditions", label: "Conditions" },
  { id: "allergies", label: "Allergies" },
  { id: "appointments", label: "Visits" },
  { id: "reminders", label: "Reminders" },
  { id: "emergency", label: "Emergency" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function FamilyTabs({ member }: { member: FamilyMemberDetail }) {
  const [tab, setTab] = useState<TabId>("overview");

  return (
    <div>
      <div className="flex gap-3 overflow-x-auto scrollbar-none pb-3 -mx-1 px-1 mb-4">
        <Link href={`/upload?familyMemberId=${member.id}`}>
          <Button size="sm" className="shrink-0 min-h-[44px]">
            <Upload className="h-4 w-4" /> Upload
          </Button>
        </Link>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 min-h-[44px]"
          onClick={() => setTab("vitals")}
        >
          <Activity className="h-4 w-4" /> Vital
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 min-h-[44px]"
          onClick={() => setTab("medications")}
        >
          <Pill className="h-4 w-4" /> Med
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 min-h-[44px]"
          onClick={() => setTab("appointments")}
        >
          <Calendar className="h-4 w-4" /> Visit
        </Button>
        <Link href={`/family/${member.id}/compare-reports`}>
          <Button size="sm" variant="outline" className="shrink-0 min-h-[44px]">
            <GitCompare className="h-4 w-4" /> Compare
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {[
          { label: "Reports", value: member.documentCount },
          { label: "Conditions", value: member.conditionCount ?? 0 },
          { label: "Meds", value: member.medicationCount ?? 0 },
          { label: "Allergies", value: member.allergyCount ?? 0 },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-center"
          >
            <p className="text-lg font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div
        className="flex gap-1 overflow-x-auto scrollbar-none border-b border-gray-200 mb-4"
        role="tablist"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 px-3 py-2.5 text-sm font-medium border-b-2 min-h-[44px] transition-colors ${
              tab === t.id
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-gray-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === "overview" && <OverviewTab member={member} />}
        {tab === "risks" && <FamilyMemberRisksPanel memberId={member.id} />}
        {tab === "reports" && <FamilyDocumentList memberId={member.id} />}
        {tab === "timeline" && <FamilyTimeline memberId={member.id} />}
        {tab === "labtrends" && <FamilyMemberLabTrendsPanel memberId={member.id} />}
        {tab === "followups" && <FamilyMemberFollowupsPanel memberId={member.id} />}
        {tab === "vitals" && <VitalsList memberId={member.id} />}
        {tab === "medications" && <MedicationList memberId={member.id} />}
        {tab === "conditions" && <ConditionList memberId={member.id} />}
        {tab === "allergies" && <AllergyList memberId={member.id} />}
        {tab === "appointments" && <AppointmentList memberId={member.id} />}
        {tab === "reminders" && <FamilyRemindersList memberId={member.id} />}
        {tab === "emergency" && (
          <div className="space-y-6">
            <EmergencyCardPanel memberId={member.id} />
            <EmergencyContactList memberId={member.id} />
          </div>
        )}
      </div>
    </div>
  );
}

function OverviewTab({ member }: { member: FamilyMemberDetail }) {
  const [nextReminder, setNextReminder] = useState<Reminder | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    api
      .getReminders(`familyMemberId=${member.id}&status=pending&limit=20`)
      .then((r) => {
        setPendingCount(r.total);
        setNextReminder(r.items[0] || null);
      })
      .catch(() => {});
  }, [member.id]);

  const activeMeds =
    member.medications?.filter((m) => m.status === "active") || [];
  const activeConds =
    member.conditions?.filter((c) => c.status === "active") || [];
  const nextAppt = member.appointments
    ?.filter((a) => a.status === "upcoming")
    .sort(
      (a, b) =>
        new Date(a.appointmentAt).getTime() - new Date(b.appointmentAt).getTime()
    )[0];

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
          <p className="text-xs text-gray-500">Latest health score</p>
          <p className="text-lg font-bold text-gray-900">
            {member.healthScoreLatest ?? "—"}
          </p>
        </div>
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
          <p className="text-xs text-gray-500">Latest report</p>
          <p className="text-sm font-medium text-gray-900">
            {member.lastReportAt
              ? new Date(member.lastReportAt).toLocaleDateString()
              : "—"}
          </p>
        </div>
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
          <p className="text-xs text-gray-500">Highest risk level</p>
          <p className="text-sm font-medium capitalize text-gray-900">
            {member.lastRiskLevel || "—"}
          </p>
        </div>
        <Link
          href={`/health-risks?familyMemberId=${member.id}`}
          className="rounded-xl bg-brand-50 border border-brand-100 p-3 flex items-center gap-2"
        >
          <ShieldAlert className="h-4 w-4 text-brand-700" />
          <span className="text-sm font-medium text-brand-800">View health risks</span>
        </Link>
      </section>

      {(pendingCount > 0 || nextReminder) && (
        <section className="rounded-xl bg-amber-50 border border-amber-100 p-3">
          <h3 className="text-sm font-semibold text-amber-900">
            Reminders ({pendingCount} pending)
          </h3>
          {nextReminder && (
            <p className="text-sm text-amber-800 mt-1">
              Next: {nextReminder.title} —{" "}
              {new Date(nextReminder.scheduledAt).toLocaleString()}
            </p>
          )}
          <Link
            href={`/reminders/new?familyMemberId=${member.id}`}
            className="text-xs font-medium text-amber-900 underline mt-2 inline-block"
          >
            Add reminder
          </Link>
        </section>
      )}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Recent reports</h3>
        {(member.documents?.length ?? 0) > 0 ? (
          <ul className="space-y-2">
            {member.documents.slice(0, 3).map((d) => (
              <li
                key={d.id}
                className="text-sm rounded-lg border border-gray-100 p-2 truncate"
              >
                {d.original_filename}
                {d.report_id && (
                  <Link
                    href={`/reports/${d.report_id}`}
                    className="text-brand-700 ml-2 text-xs"
                  >
                    View report
                  </Link>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No reports linked.</p>
        )}
      </section>
      {activeMeds.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Active medications</h3>
          <ul className="space-y-1">
            {activeMeds.slice(0, 5).map((m) => (
              <li key={m.id} className="text-sm text-gray-700">
                {m.name}
              </li>
            ))}
          </ul>
        </section>
      )}
      {activeConds.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Active conditions</h3>
          <ul className="flex flex-wrap gap-2">
            {activeConds.map((c) => (
              <Badge key={c.id} variant="warning">
                {c.name}
              </Badge>
            ))}
          </ul>
        </section>
      )}
      {(member.allergies?.length ?? 0) > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Allergies</h3>
          <ul className="flex flex-wrap gap-2">
            {member.allergies!.map((a) => (
              <Badge key={a.id} variant="critical">
                {a.name}
              </Badge>
            ))}
          </ul>
        </section>
      )}
      {nextAppt && (
        <section className="rounded-xl bg-brand-50 border border-brand-100 p-3">
          <h3 className="text-sm font-semibold text-brand-900">Next appointment</h3>
          <p className="text-sm text-brand-800 mt-1">{nextAppt.title}</p>
          <p className="text-xs text-brand-700">
            {new Date(nextAppt.appointmentAt).toLocaleString()}
          </p>
        </section>
      )}
      {(member.vitals?.length ?? 0) > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Latest vitals</h3>
          {member.vitals!.slice(0, 3).map((v) => (
            <p key={v.id} className="text-sm text-gray-600">
              {v.label}: {v.valueText || v.value}
            </p>
          ))}
        </section>
      )}
    </div>
  );
}
