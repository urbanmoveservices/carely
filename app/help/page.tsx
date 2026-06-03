import type { ReactNode } from "react";
import Link from "next/link";
import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";
import { COMPANY_NAME, PRODUCT_NAME } from "@/lib/company";

export const metadata = {
  title: `Help Center | ${PRODUCT_NAME}`,
};

function FaqItem({ q, children }: { q: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <h3 className="font-semibold text-gray-900 text-sm mb-1">{q}</h3>
      <div className="text-sm text-gray-600">{children}</div>
    </div>
  );
}

export default function HelpPage() {
  return (
    <LegalPageShell
      title="Help Center"
      subtitle={`Answers and troubleshooting for ${PRODUCT_NAME} (${COMPANY_NAME}).`}
    >
      <LegalSection title="Getting started">
        <div className="space-y-3">
          <FaqItem q="How do I create an account?">
            <p>
              Sign up at <Link href="/signup" className="text-brand-600 underline">/signup</Link>,
              accept the legal consent checkbox, then complete or skip onboarding from the
              dashboard.
            </p>
          </FaqItem>
          <FaqItem q="Onboarding is stuck — what should I do?">
            <p>
              Use <strong>Skip for now</strong> on any onboarding step. That marks onboarding
              complete and sends you to the dashboard. You can add family and uploads later.
            </p>
          </FaqItem>
        </div>
      </LegalSection>

      <LegalSection title="Uploading reports">
        <div className="space-y-3">
          <FaqItem q="Which file types are supported?">
            <p>PDF, JPG, JPEG, PNG, and DOCX (within your plan upload limit).</p>
          </FaqItem>
          <FaqItem q="Scanned PDF fails or shows no text">
            <p>
              Image-only PDFs may need to be uploaded as JPG/PNG for OCR. Password-locked
              PDFs must be unlocked first.
            </p>
          </FaqItem>
        </div>
      </LegalSection>

      <LegalSection title="AI summary & PDF">
        <div className="space-y-3">
          <FaqItem q="AI summary limit reached">
            <p>
              Free plans include limited AI summaries per month. Upgrade via{" "}
              <Link href="/billing" className="text-brand-600 underline">Billing</Link>{" "}
              (Razorpay) or wait until the next month.
            </p>
          </FaqItem>
          <FaqItem q="Download report PDF">
            <p>Open a completed report and use the download PDF action on the report page.</p>
          </FaqItem>
        </div>
      </LegalSection>

      <LegalSection title="Family, sharing & emergency">
        <div className="space-y-3">
          <FaqItem q="Adding family members">
            <p>
              Use Family from the app menu. Relation must be a valid value (e.g. self,
              mother, father).
            </p>
          </FaqItem>
          <FaqItem q="Doctor share links & caregivers">
            <p>
              Create time-limited doctor links from a report. Caregiver invites are under
              Sharing. Revoke access when no longer needed.
            </p>
          </FaqItem>
          <FaqItem q="Emergency health card">
            <p>
              Optional public link—only enable if you accept the visibility risk described on
              the <Link href="/consent" className="text-brand-600 underline">Consent</Link> page.
            </p>
          </FaqItem>
        </div>
      </LegalSection>

      <LegalSection title="Account & billing">
        <div className="space-y-3">
          <FaqItem q="Forgot password">
            <p>
              Use <Link href="/forgot-password" className="text-brand-600 underline">Forgot password</Link>{" "}
              to request a reset link (development may show the link in the API response).
            </p>
          </FaqItem>
          <FaqItem q="Email verification">
            <p>
              Resend verification from Settings. Demo accounts may already be verified.
            </p>
          </FaqItem>
          <FaqItem q="Upgrading to Pro or Family">
            <p>
              Paid plans are purchased on{" "}
              <Link href="/billing" className="text-brand-600 underline">Billing</Link> through
              Razorpay Checkout. Your plan activates only after payment verification.
            </p>
          </FaqItem>
        </div>
      </LegalSection>

      <LegalSection title="Local testing with ngrok">
        <p>
          When testing via ngrok, ensure <code className="text-xs bg-gray-100 px-1 rounded">/manifest.webmanifest</code>{" "}
          loads as JSON (not HTML). If icons fail, run{" "}
          <code className="text-xs bg-gray-100 px-1 rounded">node scripts/generate-pwa-icons.mjs</code>.
          Use the tunnel URL consistently for login and API calls.
        </p>
      </LegalSection>

      <LegalSection title="Still need help?">
        <p>
          <Link href="/contact" className="text-brand-600 underline">
            Contact us
          </Link>{" "}
          or email support@urbanmoveservices.com.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
