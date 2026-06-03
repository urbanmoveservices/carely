"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  calculateAge,
  formatRelation,
  getInitials,
} from "@/lib/family-utils";
import type { FamilyMember } from "@/types";
import { ChevronRight, Upload, Calendar, Pill, Activity } from "lucide-react";

interface FamilyMemberCardProps {
  member: FamilyMember;
}

export function FamilyMemberCard({ member }: FamilyMemberCardProps) {
  const age = member.dateOfBirth ? calculateAge(member.dateOfBirth) : null;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-800 font-semibold text-sm">
          {getInitials(member.fullName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">
                {member.fullName}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                <Badge variant="default">{formatRelation(member.relation)}</Badge>
                {age != null && (
                  <span className="text-xs text-gray-500">{age} yrs</span>
                )}
                {member.bloodGroup && (
                  <span className="text-xs text-gray-500">{member.bloodGroup}</span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <Activity className="h-3.5 w-3.5" />
              {member.documentCount} reports
            </span>
            {(member.activeConditionCount ?? 0) > 0 && (
              <span>{member.activeConditionCount} conditions</span>
            )}
            {(member.activeMedicationCount ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Pill className="h-3.5 w-3.5" />
                {member.activeMedicationCount} meds
              </span>
            )}
            {member.nextAppointment && (
              <span className="flex items-center gap-1 text-brand-700">
                <Calendar className="h-3.5 w-3.5" />
                Next: {new Date(member.nextAppointment.appointmentAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <Link href={`/family/${member.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full min-h-[44px]">
                View
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link
              href={`/upload?familyMemberId=${member.id}`}
              className="flex-1"
            >
              <Button size="sm" className="w-full min-h-[44px]">
                <Upload className="h-4 w-4" />
                Upload
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
