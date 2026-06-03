"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import type { DoctorShareLink } from "@/types";
import { Share2, Copy, Ban } from "lucide-react";
import { useTranslation } from "@/lib/i18n/use-translation";

export function ReportSharePanel({ reportId }: { reportId: string }) {
  const { t, tParams } = useTranslation();
  const [links, setLinks] = useState<DoctorShareLink[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [note, setNote] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [msg, setMsg] = useState("");

  const load = () => {
    api.getReportShareLinks(reportId).then(setLinks).catch(() => {});
  };

  useEffect(() => {
    if (open) load();
  }, [open, reportId]);

  const create = async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await api.createReportShareLink(reportId, {
        recipientName: recipientName || undefined,
        note: note || undefined,
        expiresInDays,
      });
      setMsg(t("report.shareLinkCreated"));
      await navigator.clipboard.writeText(res.shareUrl);
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4">
      <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
        <Share2 className="h-4 w-4" />
        {t("report.shareDoctor")}
      </Button>
      {open && (
        <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <p className="text-xs text-gray-500">{t("report.shareDescription")}</p>
          <Input
            placeholder={t("report.doctorNameOptional")}
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
          />
          <Input
            placeholder={t("report.noteForDoctorOptional")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <select
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(Number(e.target.value))}
          >
            {[1, 3, 7, 14, 30].map((d) => (
              <option key={d} value={d}>
                {d === 1
                  ? tParams("report.expiresInDays", { days: String(d) })
                  : tParams("report.expiresInDaysPlural", { days: String(d) })}
              </option>
            ))}
          </select>
          <Button size="sm" loading={loading} onClick={create}>
            {t("report.createCopyLink")}
          </Button>
          {msg && <Alert variant="info">{msg}</Alert>}
          {links.length > 0 && (
            <ul className="space-y-2 pt-2 border-t">
              {links.map((l) => (
                <li key={l.id} className="text-xs text-gray-600 flex flex-wrap gap-2 items-center">
                  <span>
                    {l.recipientName || t("report.link")} · expires{" "}
                    {new Date(l.expiresAt).toLocaleDateString()}
                    {l.revokedAt ? ` (${t("report.revoked")})` : ""}
                  </span>
                  {!l.revokedAt && (
                    <>
                      <button
                        type="button"
                        className="text-brand-600 inline-flex items-center gap-1"
                        onClick={() => navigator.clipboard.writeText(l.shareUrl)}
                      >
                        <Copy className="h-3 w-3" /> {t("report.copyLink")}
                      </button>
                      <button
                        type="button"
                        className="text-red-600 inline-flex items-center gap-1"
                        onClick={async () => {
                          await api.revokeShareLink(l.id);
                          load();
                        }}
                      >
                        <Ban className="h-3 w-3" /> {t("report.revoke")}
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
