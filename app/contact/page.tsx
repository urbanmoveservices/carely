"use client";

import { useState } from "react";
import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  COMPANY_NAME,
  LEGAL_EMAIL,
  PRODUCT_NAME,
  SUPPORT_EMAIL,
} from "@/lib/company";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("account");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(
      "Contact form is not connected to email yet. Please email support@urbanmoveservices.com directly."
    );
  };

  return (
    <LegalPageShell
      title="Contact"
      subtitle={`Reach ${COMPANY_NAME} about ${PRODUCT_NAME}.`}
    >
      <LegalSection title="Operator">
        <p>
          <strong>{COMPANY_NAME}</strong>
          <br />
          Product: <strong>{PRODUCT_NAME}</strong>
        </p>
      </LegalSection>

      <LegalSection title="Email">
        <ul className="space-y-1">
          <li>
            Support:{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand-600 underline">
              {SUPPORT_EMAIL}
            </a>
          </li>
          <li>
            Legal / privacy:{" "}
            <a href={`mailto:${LEGAL_EMAIL}`} className="text-brand-600 underline">
              {LEGAL_EMAIL}
            </a>
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Support categories">
        <ul className="list-disc pl-5 space-y-1">
          <li>Account access and security</li>
          <li>Billing and plans (Razorpay for paid upgrades)</li>
          <li>Privacy and data requests</li>
          <li>Technical issues (upload, OCR, AI summary)</li>
          <li>Medical safety concerns about app content (not for personal diagnosis)</li>
        </ul>
      </LegalSection>

      <LegalSection title="Contact form (placeholder)">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="subject">Subject</Label>
            <select
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm min-h-[44px]"
            >
              <option value="account">Account</option>
              <option value="billing">Billing</option>
              <option value="privacy">Privacy</option>
              <option value="technical">Technical</option>
              <option value="safety">Medical safety concern</option>
            </select>
          </div>
          <div>
            <Label htmlFor="message">Message</Label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              required
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
            />
          </div>
          <Button type="submit" className="w-full">
            Send message (local preview)
          </Button>
          <p className="text-xs text-gray-500">
            Email delivery is not configured in this MVP. Use the support email above.
          </p>
        </form>
      </LegalSection>

      <LegalSection title="Emergency warning">
        <p className="text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          Do not use this contact form for medical emergencies. Call your local emergency
          services or go to the nearest emergency department.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
