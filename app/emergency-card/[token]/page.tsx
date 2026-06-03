"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";

export default function PublicEmergencyCardPage() {
  const { token } = useParams();
  const [data, setData] = useState<{
    fullName: string;
    relation: string;
    bloodGroup?: string | null;
    allergies: { name: string }[];
    medications: { name: string; dosage?: string }[];
    conditions: { name: string }[];
    emergencyContacts: { name: string; phone: string }[];
    disclaimer: string;
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getPublicEmergencyCard(token as string)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen bg-red-50 p-6 text-center">
        <p className="text-red-800 font-bold text-lg">Emergency card unavailable</p>
        <p className="text-sm text-red-600 mt-2">{error}</p>
      </div>
    );
  }

  if (!data) return <div className="min-h-screen bg-red-50 p-6">Loading…</div>;

  return (
    <div className="min-h-screen bg-red-600 text-white">
      <header className="px-4 py-8 text-center">
        <p className="text-red-200 text-sm uppercase tracking-wide">Emergency Health Card</p>
        <h1 className="text-3xl font-bold mt-2">{data.fullName}</h1>
        <p className="text-red-100">{data.relation}</p>
        {data.bloodGroup ? (
          <p className="text-2xl font-bold mt-4">Blood group: {data.bloodGroup}</p>
        ) : null}
      </header>
      <main className="bg-white text-gray-900 rounded-t-3xl px-4 py-6 space-y-5 -mt-4">
        {data.allergies.length > 0 && (
          <section>
            <h2 className="font-bold text-red-700 text-lg">Allergies</h2>
            <ul className="mt-1 space-y-1">
              {data.allergies.map((a, i) => (
                <li key={i} className="text-lg font-medium">
                  {a.name}
                </li>
              ))}
            </ul>
          </section>
        )}
        {data.medications.length > 0 && (
          <section>
            <h2 className="font-bold text-gray-900">Medications</h2>
            <ul className="text-sm mt-1 space-y-1">
              {data.medications.map((m, i) => (
                <li key={i}>
                  {m.name}
                  {m.dosage ? ` — ${m.dosage}` : ""}
                </li>
              ))}
            </ul>
          </section>
        )}
        {data.conditions.length > 0 && (
          <section>
            <h2 className="font-bold text-gray-900">Conditions</h2>
            <ul className="text-sm mt-1">
              {data.conditions.map((c, i) => (
                <li key={i}>{c.name}</li>
              ))}
            </ul>
          </section>
        )}
        {data.emergencyContacts.length > 0 && (
          <section>
            <h2 className="font-bold text-gray-900">Emergency contacts</h2>
            <ul className="mt-1 space-y-2">
              {data.emergencyContacts.map((c, i) => (
                <li key={i}>
                  <a href={`tel:${c.phone}`} className="text-brand-700 font-semibold text-lg">
                    {c.name}: {c.phone}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="text-xs text-gray-500 border-t pt-4">{data.disclaimer}</p>
      </main>
    </div>
  );
}
