import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LAB_TESTS = [
  { name: "Hemoglobin", category: "Blood Count", unit: "g/dL", normalMin: 12, normalMax: 17, explanation: "Hemoglobin carries oxygen in red blood cells.", highMeaning: "May indicate dehydration or other conditions—follow your lab report.", lowMeaning: "May suggest anemia—discuss with your doctor." },
  { name: "WBC", aliases: ["White Blood Cells", "Leukocytes"], category: "Blood Count", unit: "cells/µL", normalMin: 4000, normalMax: 11000, explanation: "White blood cells help fight infection.", highMeaning: "Often seen with infection or inflammation.", lowMeaning: "May occur with certain medications or bone marrow conditions." },
  { name: "RBC", aliases: ["Red Blood Cells"], category: "Blood Count", unit: "million/µL", normalMin: 4.2, normalMax: 6.1, explanation: "Red blood cells carry oxygen.", highMeaning: "Can vary with altitude, hydration, and other factors.", lowMeaning: "May relate to anemia or blood loss." },
  { name: "Platelets", category: "Blood Count", unit: "lakhs/µL", normalMin: 1.5, normalMax: 4.5, explanation: "Platelets help blood clot.", highMeaning: "May increase clot risk in some situations—clinical context matters.", lowMeaning: "Low counts can increase bleeding risk." },
  { name: "Fasting Blood Sugar", aliases: ["FBS", "Fasting Glucose"], category: "Diabetes", unit: "mg/dL", normalMin: 70, normalMax: 100, explanation: "Blood sugar after fasting helps screen for diabetes.", highMeaning: "May suggest prediabetes or diabetes—confirm with your doctor.", lowMeaning: "Low fasting glucose may need evaluation if symptomatic." },
  { name: "Random Blood Sugar", aliases: ["RBS"], category: "Diabetes", unit: "mg/dL", normalText: "Typically < 140 mg/dL (non-fasting context varies)", explanation: "Random glucose without fasting has limited screening value alone.", highMeaning: "Elevated values may need repeat testing or HbA1c.", lowMeaning: "Very low values can be urgent if symptomatic." },
  { name: "HbA1c", aliases: ["Glycated Hemoglobin"], category: "Diabetes", unit: "%", normalMax: 5.7, normalText: "< 5.7% (non-diabetic reference)", explanation: "HbA1c reflects average blood sugar over ~3 months.", highMeaning: "Higher values suggest poorer long-term glucose control.", lowMeaning: "Very low values may occur with treatment or other conditions." },
  { name: "Total Cholesterol", category: "Lipid Profile", unit: "mg/dL", normalMax: 200, explanation: "Total cholesterol includes LDL, HDL, and other fractions.", highMeaning: "Higher cardiovascular risk may warrant lifestyle or medication discussion.", lowMeaning: "Very low cholesterol is uncommon; interpret with full lipid panel." },
  { name: "LDL", aliases: ["LDL Cholesterol"], category: "Lipid Profile", unit: "mg/dL", normalMax: 100, explanation: "LDL is often called 'bad' cholesterol.", highMeaning: "Higher LDL is associated with cardiovascular risk.", lowMeaning: "Low LDL is generally favorable." },
  { name: "HDL", aliases: ["HDL Cholesterol"], category: "Lipid Profile", unit: "mg/dL", normalMin: 40, explanation: "HDL is often called 'good' cholesterol.", highMeaning: "Higher HDL is generally protective.", lowMeaning: "Low HDL may increase cardiovascular risk." },
  { name: "Triglycerides", category: "Lipid Profile", unit: "mg/dL", normalMax: 150, explanation: "Triglycerides are a type of blood fat.", highMeaning: "High triglycerides may relate to diet, diabetes, or other factors.", lowMeaning: "Low triglycerides are usually not concerning." },
  { name: "TSH", category: "Thyroid", unit: "mIU/L", normalMin: 0.4, normalMax: 4.0, explanation: "TSH regulates thyroid hormone production.", highMeaning: "May suggest underactive thyroid (hypothyroidism).", lowMeaning: "May suggest overactive thyroid (hyperthyroidism)." },
  { name: "T3", category: "Thyroid", unit: "ng/dL", normalText: "Varies by assay—use lab reference", explanation: "T3 is an active thyroid hormone.", highMeaning: "Interpret with TSH and clinical context.", lowMeaning: "Low T3 may occur in illness or thyroid disorders." },
  { name: "T4", aliases: ["Thyroxine"], category: "Thyroid", unit: "µg/dL", normalText: "Varies by assay—use lab reference", explanation: "T4 is a major thyroid hormone.", highMeaning: "Elevated with hyperthyroidism or supplementation.", lowMeaning: "Low with hypothyroidism or illness." },
  { name: "Creatinine", category: "Kidney", unit: "mg/dL", normalMin: 0.6, normalMax: 1.3, explanation: "Creatinine reflects kidney filtration.", highMeaning: "May suggest reduced kidney function.", lowMeaning: "Low values are usually not clinically significant." },
  { name: "Urea", aliases: ["BUN", "Blood Urea Nitrogen"], category: "Kidney", unit: "mg/dL", normalMin: 15, normalMax: 45, explanation: "Urea is a waste product filtered by kidneys.", highMeaning: "May rise with dehydration, high protein intake, or kidney issues.", lowMeaning: "Low urea is often not significant." },
  { name: "SGPT/ALT", aliases: ["ALT", "SGPT"], category: "Liver", unit: "U/L", normalMax: 40, explanation: "ALT is a liver enzyme.", highMeaning: "Elevated ALT may indicate liver inflammation or damage.", lowMeaning: "Low ALT is usually normal." },
  { name: "SGOT/AST", aliases: ["AST", "SGOT"], category: "Liver", unit: "U/L", normalMax: 40, explanation: "AST is found in liver and other tissues.", highMeaning: "Elevated AST may indicate liver or muscle injury.", lowMeaning: "Low AST is usually normal." },
  { name: "Bilirubin", aliases: ["Total Bilirubin"], category: "Liver", unit: "mg/dL", normalMax: 1.2, explanation: "Bilirubin is a breakdown product of red blood cells.", highMeaning: "May cause jaundice; evaluate liver or bile ducts.", lowMeaning: "Low bilirubin is typically normal." },
  { name: "Vitamin D", aliases: ["25-OH Vitamin D"], category: "Vitamins", unit: "ng/mL", normalMin: 20, normalMax: 50, explanation: "Vitamin D supports bone and immune health.", highMeaning: "Excess supplementation can cause high levels.", lowMeaning: "Deficiency is common; supplementation may be discussed." },
  { name: "Vitamin B12", category: "Vitamins", unit: "pg/mL", normalMin: 200, normalMax: 900, explanation: "B12 is important for nerves and blood cells.", highMeaning: "High levels are often benign.", lowMeaning: "Low B12 can cause anemia and neuropathy symptoms." },
  { name: "CRP", aliases: ["C-Reactive Protein"], category: "Inflammation", unit: "mg/L", normalMax: 3, explanation: "CRP rises with inflammation and infection.", highMeaning: "Indicates inflammation—infections, autoimmune disease, etc.", lowMeaning: "Low CRP is generally favorable." },
];

const DISCLAIMER =
  "Reference ranges vary by lab, age, sex, pregnancy status, and medical history. Always follow your lab report and doctor's advice.";

async function main() {
  for (const test of LAB_TESTS) {
    const existing = await prisma.labTestReference.findFirst({
      where: { name: test.name },
    });
    if (existing) {
      await prisma.labTestReference.update({
        where: { id: existing.id },
        data: { ...test, aliases: test.aliases ?? undefined, disclaimer: DISCLAIMER },
      });
    } else {
      await prisma.labTestReference.create({
        data: {
          ...test,
          aliases: test.aliases ?? undefined,
          disclaimer: DISCLAIMER,
        },
      });
    }
  }
  console.log(`Seeded ${LAB_TESTS.length} lab test references.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
