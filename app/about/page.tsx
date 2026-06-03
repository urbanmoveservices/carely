import Link from "next/link";
import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";
import { BRAND } from "@/lib/brand";
import { COMPANY_NAME, PRODUCT_NAME } from "@/lib/company";

export const metadata = {
  title: `About | ${BRAND.name}`,
};

export default function AboutPage() {
  return (
    <LegalPageShell
      title={`About ${PRODUCT_NAME}`}
      subtitle="Helping families understand and organize medical reports with AI assistance."
    >
      <LegalSection title="What we do">
        <p>
          {PRODUCT_NAME} helps you upload lab reports and health documents, extract text,
          generate plain-language AI summaries, track family health data, set reminders,
          and share information safely with caregivers or doctors when you choose.
        </p>
      </LegalSection>

      <LegalSection title="Built and operated by">
        <p>
          {PRODUCT_NAME} is built and operated by <strong>{COMPANY_NAME}</strong>.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          {PRODUCT_NAME} was previously developed under the working name{" "}
          <strong>{BRAND.previousName}</strong>.
        </p>
      </LegalSection>

      <LegalSection title="Mission">
        <p>
          Our mission is to help families understand medical reports and receive
          AI-assisted diagnosis and treatment guidance so they can act on their health
          data with confidence.
        </p>
      </LegalSection>

      <LegalSection title="Features">
        <ul className="list-disc pl-5 space-y-1">
          <li>Report upload (PDF, images, DOCX) with OCR and text extraction</li>
          <li>AI summaries, abnormal value highlights, and downloadable PDFs</li>
          <li>Family health profiles, vitals, medications, and appointments</li>
          <li>Reminders, insights, health risk cards, and lab test reference library</li>
          <li>Doctor share links, caregiver access, and emergency health cards</li>
          <li>Plans with usage limits and Razorpay paid upgrades</li>
        </ul>
      </LegalSection>

      <LegalSection title="Clinical AI guidance">
        <p>
          We present AI output as diagnosis and treatment guidance derived from your
          reports and health context. Confirm critical values with your original reports
          and your doctor when needed.
        </p>
      </LegalSection>

      <LegalSection title="Limitations">
        <p>
          The Service is not a substitute for emergency or in-person care. AI can make
          mistakes. Production use requires legal, privacy, and security review.
        </p>
      </LegalSection>

      <LegalSection title="Learn more">
        <p>
          <Link href="/disclaimer" className="text-brand-600 underline">
            Medical Disclaimer
          </Link>
          {" · "}
          <Link href="/privacy" className="text-brand-600 underline">
            Privacy Policy
          </Link>
          {" · "}
          <Link href="/terms" className="text-brand-600 underline">
            Terms of Use
          </Link>
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
