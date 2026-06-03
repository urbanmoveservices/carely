import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";
import { COMPANY_NAME, PRODUCT_NAME, SUPPORT_EMAIL } from "@/lib/company";

export const metadata = {
  title: `Terms of Use | ${PRODUCT_NAME}`,
};

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms of Use"
      subtitle={`Rules for using ${PRODUCT_NAME}, operated by ${COMPANY_NAME}.`}
    >
      <LegalSection title="1. Acceptance of terms">
        <p>
          By creating an account or using the Service, you agree to these Terms of Use
          and our Privacy Policy and Consent pages.
        </p>
      </LegalSection>

      <LegalSection title="2. Operator">
        <p>
          The Service is provided by <strong>{COMPANY_NAME}</strong>.
        </p>
      </LegalSection>

      <LegalSection title="3. Eligibility">
        <p>
          You must be able to form a binding agreement under applicable law and use the
          Service only where it is lawful to do so.
        </p>
      </LegalSection>

      <LegalSection title="4. Account responsibility">
        <p>
          You are responsible for safeguarding login credentials and for activity under
          your account. Notify us if you suspect unauthorized access.
        </p>
      </LegalSection>

      <LegalSection title="5. Permitted use">
        <p>
          Use the Service to organize your family&apos;s medical reports and receive
          AI-assisted diagnosis and treatment guidance, subject to plan limits and
          applicable law.
        </p>
      </LegalSection>

      <LegalSection title="6. Prohibited use">
        <ul className="list-disc pl-5 space-y-1">
          <li>Uploading malware, unlawful content, or data you lack rights to use</li>
          <li>Attempting to bypass security, quotas, or access controls</li>
          <li>Using the Service as the sole resource for life-threatening emergencies</li>
          <li>Impersonation, harassment, or fraudulent activity</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Medical disclaimer">
        <p>
          The Service provides AI-assisted medical diagnosis and treatment guidance. See
          our Medical Disclaimer for full details.
        </p>
      </LegalSection>

      <LegalSection title="8. AI limitations">
        <p>
          AI summaries may be incomplete, outdated, or incorrect. Confirm critical
          decisions with a qualified healthcare professional when appropriate.
        </p>
      </LegalSection>

      <LegalSection title="9. Upload responsibility">
        <p>
          You confirm you have the right to upload documents and that uploads comply
          with applicable privacy and consent requirements.
        </p>
      </LegalSection>

      <LegalSection title="10. Family and caregiver sharing">
        <p>
          You are responsible for invites, share links, and emergency card links you
          create. Revoke access when it is no longer appropriate.
        </p>
      </LegalSection>

      <LegalSection title="11. Billing and plans">
        <p>
          Paid plan upgrades are processed through Razorpay. The Free plan does not require
          payment. Displayed prices and limits may change with notice.
        </p>
      </LegalSection>

      <LegalSection title="12. Intellectual property">
        <p>
          The Service, branding, and software are owned by {COMPANY_NAME} or its
          licensors. You retain rights to your uploaded content subject to the license
          needed to operate the Service.
        </p>
      </LegalSection>

      <LegalSection title="13. Limitation of liability">
        <p>
          To the maximum extent permitted by law, {COMPANY_NAME} is not liable for
          indirect, incidental, or consequential damages arising from use of the
          Service, including reliance on AI output.
        </p>
      </LegalSection>

      <LegalSection title="14. Termination">
        <p>
          We may suspend or terminate accounts for violations. You may stop using the
          Service at any time.
        </p>
      </LegalSection>

      <LegalSection title="15. Changes to terms">
        <p>
          We may update these terms. Continued use after changes constitutes acceptance
          of the revised terms where permitted by law.
        </p>
      </LegalSection>

      <LegalSection title="16. Contact">
        <p>
          Questions:{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand-600 underline">
            {SUPPORT_EMAIL}
          </a>
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
