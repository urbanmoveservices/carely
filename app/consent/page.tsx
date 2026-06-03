import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";
import { COMPANY_NAME, PRODUCT_NAME, SUPPORT_EMAIL } from "@/lib/company";

export const metadata = {
  title: `Consent & Data Use | ${PRODUCT_NAME}`,
};

export default function ConsentPage() {
  return (
    <LegalPageShell
      title="Consent & Data Use"
      subtitle="What you agree to when using AI-assisted medical report processing."
    >
      <LegalSection title="Operator">
        <p>
          {PRODUCT_NAME} is operated by <strong>{COMPANY_NAME}</strong>.
        </p>
      </LegalSection>

      <LegalSection title="Uploading medical documents">
        <p>
          By uploading reports, you consent to storage, text extraction (OCR/PDF parsing),
          and display of document content within your account.
        </p>
      </LegalSection>

      <LegalSection title="AI-assisted processing">
        <p>
          You consent to automated analysis of extracted text to produce summaries,
          diagnosis guidance, treatment recommendations, highlights, charts, and related
          insights.
        </p>
      </LegalSection>

      <LegalSection title="Family member data">
        <p>
          You should add family members only when you have appropriate permission or legal
          authority (e.g., parent/guardian for a child).
        </p>
      </LegalSection>

      <LegalSection title="Caregiver sharing">
        <p>
          Inviting caregivers shares access to data you authorize. You are responsible for
          choosing trustworthy recipients and revoking access when needed.
        </p>
      </LegalSection>

      <LegalSection title="Doctor share links">
        <p>
          Share links may expose selected report information to anyone with the link until
          expiry or revocation. Use expiring links and share only with intended recipients.
        </p>
      </LegalSection>

      <LegalSection title="Emergency health card">
        <p>
          Emergency card links may be publicly accessible if you enable them. Only include
          information you are comfortable sharing in an emergency context.
        </p>
      </LegalSection>

      <LegalSection title="Withdrawal and deletion">
        <p>
          You may stop using the Service and request account/data deletion by contacting{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand-600 underline">
            {SUPPORT_EMAIL}
          </a>
          . Full self-service deletion may be added in a future release.
        </p>
      </LegalSection>

      <LegalSection title="Medical disclaimer">
        <p>
          This Service explains your uploaded reports and saved health data and supports
          care planning. It is not a final diagnosis or a substitute for emergency or
          in-person care. See the{" "}
          <a href="/disclaimer" className="text-brand-600 underline">
            Medical Disclaimer
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
