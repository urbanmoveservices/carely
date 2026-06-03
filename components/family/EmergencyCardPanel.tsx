"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import type { EmergencyHealthCard } from "@/types";
import { Download, Copy } from "lucide-react";

export function EmergencyCardPanel({ memberId }: { memberId: string }) {
  const [card, setCard] = useState<EmergencyHealthCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const load = () => {
    api.getEmergencyCard(memberId).then(setCard).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [memberId]);

  const create = async () => {
    const c = await api.upsertEmergencyCard(memberId, { isEnabled: true });
    setCard(c);
    setMsg("Emergency card created");
  };

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Emergency-safe info only (allergies, meds, conditions, contacts). Enable public link only if you are comfortable sharing.
      </p>
      {!card ? (
        <Button onClick={create} className="min-h-[44px]">
          Generate Emergency Card
        </Button>
      ) : (
        <>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={card.isEnabled}
              onChange={async (e) => {
                const c = await api.upsertEmergencyCard(memberId, { isEnabled: e.target.checked });
                setCard(c);
              }}
            />
            Public link enabled
          </label>
          {card.isEnabled && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px]"
                onClick={() => navigator.clipboard.writeText(card.publicUrl)}
              >
                <Copy className="h-4 w-4" /> Copy link
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px]"
                onClick={async () => {
                  await api.downloadEmergencyCardPdf(memberId);
                }}
              >
                <Download className="h-4 w-4" /> PDF
              </Button>
            </div>
          )}
          <p className="text-xs text-gray-400 break-all">{card.publicUrl}</p>
        </>
      )}
      {msg && <Alert variant="info">{msg}</Alert>}
    </div>
  );
}
