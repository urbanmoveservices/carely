import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";
import {
  COMPANY_NAME,
  COMPLIANCE_NOTE,
  PRODUCT_NAME,
  SUPPORT_EMAIL,
} from "@/lib/company";

export const metadata = {
  title: `Privacy Policy | ${PRODUCT_NAME}`,
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      subtitle={`How ${PRODUCT_NAME} collects, uses, and protects information when operated by ${COMPANY_NAME}.`}
    >
      <LegalSection title="1. Introduction">
        <p>
          This Privacy Policy describes how {PRODUCT_NAME} (&quot;the Service&quot;)
          handles personal and health-related information. The Service is built and
          operated by {COMPANY_NAME}.
        </p>
      </LegalSection>

      <LegalSection title="2. Operator">
        <p>
          <strong>{COMPANY_NAME}</strong> is the operator of {PRODUCT_NAME} for
          purposes described in this policy.
        </p>
      </LegalSection>

      <LegalSection title="3. Information we collect">
        <ul className="list-disc pl-5 space-y-1">
          <li>Account information (name, email, password hash, role, plan)</li>
          <li>Uploaded medical documents (PDF, images, DOCX)</li>
          <li>Extracted text from documents (OCR and parsing)</li>
          <li>AI-generated summaries, findings, and recommendations</li>
          <li>Family member profiles, vitals, medications, appointments, conditions</li>
          <li>Reminders, symptom journal entries, and preferences</li>
          <li>Usage and billing plan data (including Razorpay payment records)</li>
          <li>Audit and security logs (login, uploads, sharing, admin actions)</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. How we use data">
        <ul className="list-disc pl-5 space-y-1">
          <li>Authentication, account management, and email verification</li>
          <li>Report upload, text extraction, and AI summarization</li>
          <li>Family health organization, reminders, and insights</li>
          <li>Enforcing plan limits (uploads, AI summaries, family members)</li>
          <li>Security monitoring, abuse prevention, and admin support</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Medical data sensitivity">
        <p>
          Medical reports and health records are sensitive. You should only upload
          information you are authorized to store and process. The Service is not
          intended for emergency use.
        </p>
      </LegalSection>

      <LegalSection title="6. Local MVP / development">
        <p>
          In local or development deployments, files may be stored on the machine
          running the application. Production deployments should use encrypted storage,
          access controls, backups, and reviewed hosting practices.
        </p>
      </LegalSection>

      <LegalSection title="7. Sharing">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Doctor share links:</strong> time-limited links you create to share
            specific reports
          </li>
          <li>
            <strong>Caregiver sharing:</strong> invites you send to trusted caregivers
          </li>
          <li>
            <strong>Emergency card:</strong> optional public link with limited health
            information you control
          </li>
          <li>
            <strong>Admin access:</strong> authorized administrators may access data for
            support and operations as configured
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="8. Data security">
        <p>
          We use industry-appropriate measures such as password hashing, JWT
          authentication, server-side validation, and audit logging. No system is
          perfectly secure; you are responsible for protecting your account credentials.
        </p>
      </LegalSection>

      <LegalSection title="9. Data retention and deletion">
        <p>
          Data is retained while your account is active and as needed for the Service.
          Account deletion and data erasure workflows may be expanded in future releases.
          Contact us to request deletion assistance (placeholder process).
        </p>
      </LegalSection>

      <LegalSection title="10. Your choices">
        <p>
          You can update profile settings, manage family members, revoke share links,
          and adjust caregiver access from within the app where available.
        </p>
      </LegalSection>

      <LegalSection title="11. Children and minors">
        <p>
          Family health features may include data about minors added by a parent or
          legal guardian. You represent that you have appropriate authority to add and
          manage such information.
        </p>
      </LegalSection>

      <LegalSection title="12. Contact">
        <p>
          Privacy questions:{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand-600 underline">
            {SUPPORT_EMAIL}
          </a>
        </p>
      </LegalSection>

      <LegalSection title="13. Regulatory compliance">
        <p>{COMPLIANCE_NOTE}</p>
      </LegalSection>
    </LegalPageShell>
  );
}
