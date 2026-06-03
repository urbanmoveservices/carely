"use client";

import React from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminProtectedRoute } from "./AdminProtectedRoute";
import type { User } from "@/types";

interface AdminLayoutProps {
  children: (user: User) => React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminProtectedRoute>
      {(user) => (
        <div className="min-h-screen bg-gray-50">
          <AdminSidebar />
          <main className="ml-64 p-8">{children(user)}</main>
        </div>
      )}
    </AdminProtectedRoute>
  );
}
