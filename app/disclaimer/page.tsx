import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";

import { MEDICAL_DISCLAIMER } from "@/lib/brand";

import { COMPANY_NAME, PRODUCT_NAME } from "@/lib/company";



export const metadata = {

  title: `Medical Disclaimer | ${PRODUCT_NAME}`,

};



export default function DisclaimerPage() {

  return (

    <LegalPageShell

      title="Medical Disclaimer"

      subtitle={`How ${PRODUCT_NAME} presents AI-assisted diagnosis and treatment guidance.`}

    >

      <LegalSection title="Diagnosis and treatment support">

        <p>
          <strong>{PRODUCT_NAME}</strong>, operated by <strong>{COMPANY_NAME}</strong>.
          {" "}
          {MEDICAL_DISCLAIMER}
        </p>

        <p className="mt-2">

          The Service is designed to help you understand lab reports, identify likely

          conditions, and receive AI-generated treatment recommendations—including

          medication and lifestyle guidance—based on your uploads and health context.

        </p>

      </LegalSection>



      <LegalSection title="What the Service provides">

        <ul className="list-disc pl-5 space-y-1">

          <li>AI-assisted interpretation of lab and medical report values</li>

          <li>Likely diagnoses and clinical impressions supported by your data</li>

          <li>Treatment and medication suggestions aligned with your profile</li>

          <li>Follow-up plans, lifestyle advice, and doctor discussion materials</li>

        </ul>

      </LegalSection>



      <LegalSection title="Emergencies">

        <p>

          If you or someone else has severe symptoms, chest pain, difficulty breathing,

          stroke signs, heavy bleeding, or any life-threatening condition, seek urgent

          in-person medical care immediately (e.g., local emergency number or hospital

          emergency department). Do not rely on the app alone for emergency decisions.

        </p>

      </LegalSection>



      <LegalSection title="AI limitations">

        <p>

          AI-generated summaries can be wrong, incomplete, or miss critical context.

          Confirm important values with your original reports and a qualified clinician

          before starting or changing treatment.

        </p>

      </LegalSection>



      <LegalSection title="Lab reference ranges">

        <p>

          Normal ranges vary by laboratory, age, sex, pregnancy status, medications, and

          medical history. Use app highlights together with your doctor&apos;s judgment.

        </p>

      </LegalSection>



      <LegalSection title="Professional follow-up">

        <p>

          We recommend physician confirmation for prescriptions and major treatment

          changes. {PRODUCT_NAME} supports your care journey with diagnosis and treatment

          guidance—it does not replace in-person care when you need it.

        </p>

      </LegalSection>

    </LegalPageShell>

  );

}

