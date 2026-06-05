"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { adminApi } from "@/lib/admin-api-client";
import type { User } from "@/types";

type Stats = {
  smtpConfigured?: boolean;
  dnsNote?: string;
  sentToday?: number;
  failedToday?: number;
  pendingQueue?: number;
  unsubscribedUsers?: number;
  marketingOptInCount?: number;
  recentLogs?: Array<{
    id: string;
    to: string;
    subject: string;
    type: string;
    status: string;
    createdAt: string;
  }>;
};

type Campaign = {
  id: string;
  name: string;
  subject: string;
  status: string;
  templateKey: string;
  category: string;
  _count?: { recipients: number };
};

export default function AdminEmailMarketingPage() {
  return (
    <AdminLayout>
      {(user) => <Content user={user} />}
    </AdminLayout>
  );
}

function Content({ user }: { user: User }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [templateKey, setTemplateKey] = useState("monthly_health_newsletter");
  const [segment, setSegment] = useState("marketing_opt_in");
  const [msg, setMsg] = useState("");

  async function load() {
    const [s, c] = await Promise.all([
      adminApi.get<Stats>("/api/admin/email/stats"),
      adminApi.get<{ campaigns: Campaign[] }>("/api/admin/email/campaigns"),
    ]);
    setStats(s);
    setCampaigns(c.campaigns || []);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function createCampaign() {
    setMsg("");
    await adminApi.post("/api/admin/email/campaigns", {
      name,
      subject,
      templateKey,
      category: "marketing",
      segment,
      previewText: subject,
      contentJson: { body: "Health education from Vaidya GPT — no personal medical data in email." },
    });
    setMsg("Draft campaign created.");
    await load();
  }

  async function sendTest(id: string) {
    await adminApi.post(`/api/admin/email/campaigns/${id}/send-test`, {});
    setMsg("Test email sent to support address.");
  }

  async function schedule(id: string) {
    await adminApi.post(`/api/admin/email/campaigns/${id}/schedule`, {});
    setMsg("Campaign scheduled.");
    await load();
  }

  return (
    <div>
      <AdminHeader title="Email Marketing" description="Campaigns, stats, and SMTP health" user={user} />

      {msg && <p className="text-sm text-green-700 mb-4">{msg}</p>}

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Metric label="Sent today" value={stats?.sentToday ?? 0} />
        <Metric label="Failed today" value={stats?.failedToday ?? 0} />
        <Metric label="Marketing opt-in" value={stats?.marketingOptInCount ?? 0} />
        <Metric label="Unsubscribed" value={stats?.unsubscribedUsers ?? 0} />
      </div>

      <Card className="mb-6">
        <CardContent className="py-4 text-sm">
          <p>
            SMTP: {stats?.smtpConfigured ? "Configured" : "Not configured"}
          </p>
          <p className="text-amber-700 mt-1">{stats?.dnsNote}</p>
          <p className="text-gray-500 mt-1">
            Marketing sends require EMAIL_MARKETING_ENABLED=true in env.
          </p>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Create draft campaign</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Campaign name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={templateKey}
              onChange={(e) => setTemplateKey(e.target.value)}
            >
              <option value="monthly_health_newsletter">Newsletter</option>
              <option value="new_feature_chatbot">New feature: Chatbot</option>
              <option value="new_feature_nutrition">New feature: Nutrition</option>
              <option value="pro_plan_promo">Pro plan promo</option>
              <option value="family_plan_promo">Family plan promo</option>
            </select>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
            >
              <option value="marketing_opt_in">Marketing opt-in only</option>
              <option value="newsletter_opt_in">Newsletter opt-in only</option>
              <option value="all_verified">All verified users</option>
              <option value="free_users">Free users</option>
              <option value="inactive_users">Inactive users</option>
            </select>
            <Button onClick={createCampaign} disabled={!name || !subject}>
              Save draft
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {campaigns.map((c) => (
                <li key={c.id} className="border rounded-lg p-3">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-gray-500">{c.subject} · {c.status}</p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" onClick={() => sendTest(c.id)}>
                      Send test
                    </Button>
                    <Button size="sm" onClick={() => schedule(c.id)}>
                      Schedule
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent email logs</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-2">
            {(stats?.recentLogs ?? []).map((l) => (
              <li key={l.id} className="flex justify-between gap-2">
                <span className="truncate">{l.subject}</span>
                <span className="text-gray-500 shrink-0">{l.status}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs text-gray-500 uppercase">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
