import React from "react";
import type { User } from "@/types";
import { Badge } from "@/components/ui/Badge";

interface AdminHeaderProps {
  title: string;
  description?: string;
  user: User;
  actions?: React.ReactNode;
}

export function AdminHeader({
  title,
  description,
  user,
  actions,
}: AdminHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 border border-gray-200">
          <span className="text-sm font-medium text-gray-700">
            {user.name}
          </span>
          <Badge variant="admin">Admin</Badge>
        </div>
      </div>
    </div>
  );
}
