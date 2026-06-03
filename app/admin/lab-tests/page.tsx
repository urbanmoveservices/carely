"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/admin-api-client";
import { Button } from "@/components/ui/Button";

export default function AdminLabTestsPage() {
  return <AdminLayout>{() => <AdminLabTestsContent />}</AdminLayout>;
}

function AdminLabTestsContent() {
  const [items, setItems] = useState<{ id: string; name: string; category: string }[]>([]);

  useEffect(() => {
    adminApi.getLabTests().then((r) => setItems(r.items as typeof items));
  }, []);

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Lab Test References</h1>
      <p className="text-sm text-gray-500 mb-4">
        Manage lab test reference entries. Run <code>npm run lab-tests:seed</code> to populate defaults.
      </p>
      <ul className="space-y-2">
        {items.map((t) => (
          <li key={t.id} className="rounded-lg border bg-white px-4 py-3 text-sm flex justify-between">
            <span className="font-medium">{t.name}</span>
            <span className="text-gray-500">{t.category}</span>
          </li>
        ))}
      </ul>
      {items.length === 0 && (
        <p className="text-sm text-gray-500">No lab tests. Seed the database first.</p>
      )}
    </>
  );
}
