import type { AbnormalValue, KeyFinding, RiskFlag } from "@/types";
import { getAiLanguageInstruction } from "@/lib/i18n/ai-language";
import { translate } from "@/lib/i18n/translations";

export interface DoctorQuestion {
  category: string;
  question: string;
  whyAsk: string;
}

function isMockMode(): boolean {
  if (process.env.MOCK_AI_MODE === "true") return true;
  if (!process.env.OPENAI_API_KEY) return true;
  return false;
}

export function generateMockDoctorQuestions(params: {
  summary: string;
  keyFindings: KeyFinding[];
  abnormalValues: AbnormalValue[];
  riskFlags: RiskFlag[];
}): { summary: string; questions: DoctorQuestion[]; aiModelUsed: string } {
  const questions: DoctorQuestion[] = [];
  const categories = new Set<string>();

  for (const av of params.abnormalValues.slice(0, 8)) {
    const cat = av.name.split(" ")[0] || "Lab Results";
    categories.add(cat);
    questions.push({
      category: cat,
      question: `What does my ${av.name} result (${av.value}) mean, and should we repeat this test?`,
      whyAsk: `Your report lists ${av.name} as potentially outside typical reference ranges. A clinician can interpret this in context.`,
    });
  }

  for (const kf of params.keyFindings.filter((k) => k.status !== "normal").slice(0, 4)) {
    questions.push({
      category: kf.title,
      question: `Can you explain my ${kf.title} finding (${kf.value}) and whether follow-up is needed?`,
      whyAsk: kf.explanation || "This finding appeared in your saved report summary.",
    });
  }

  for (const rf of params.riskFlags.slice(0, 3)) {
    questions.push({
      category: "Follow-up",
      question: `My report noted: "${rf.message}". What follow-up steps would you recommend?`,
      whyAsk: "Risk flags in your report may benefit from a clinician's review.",
    });
  }

  if (questions.length === 0) {
    questions.push({
      category: "General",
      question: "Are there any results in this report I should monitor or repeat?",
      whyAsk: "A general review helps ensure you understand your report findings.",
    });
    questions.push({
      category: "Lifestyle",
      question: "Based on this report, are there lifestyle changes worth discussing?",
      whyAsk: "Lifestyle topics are often part of preventive care conversations.",
    });
  }

  return {
    summary:
      "Suggested questions from your saved report—for discussion with your doctor.",
    questions,
    aiModelUsed: "mock-rule-based",
  };
}

export async function generateDoctorQuestions(params: {
  summary: string;
  keyFindings: KeyFinding[];
  abnormalValues: AbnormalValue[];
  riskFlags: RiskFlag[];
  filename: string;
  language?: string | null;
}): Promise<{ summary: string; questions: DoctorQuestion[]; aiModelUsed: string }> {
  const lang = params.language || "en";
  if (isMockMode()) {
    const mock = generateMockDoctorQuestions(params);
    if (lang === "hi") {
      return {
        ...mock,
        summary:
          "आपकी सहेजी गई रिपोर्ट के आधार पर डॉक्टर से पूछने के सुझावित प्रश्न। यह केवल चर्चा के लिए है—चिकित्सा सलाह नहीं।",
        questions: mock.questions.map((q) => ({
          ...q,
          question: q.question.replace(
            "What does my",
            "मेरे"
          ).replace(
            "mean, and should we repeat this test?",
            "का क्या मतलब है, क्या हमें यह टेस्ट दोहराना चाहिए?"
          ),
        })),
      };
    }
    return mock;
  }

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = `Based on this medical report summary, generate 5-10 questions a patient could ask their doctor. Do NOT diagnose or prescribe. Return JSON only:
{"summary":"...","questions":[{"category":"...","question":"...","whyAsk":"..."}]}

Report filename: ${params.filename}
Summary: ${params.summary.slice(0, 2000)}
Abnormal values: ${JSON.stringify(params.abnormalValues.slice(0, 10))}
Risk flags: ${JSON.stringify(params.riskFlags.slice(0, 5))}`;

    const res = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You help patients prepare questions for doctor visits. Never diagnose. Return valid JSON only. " +
            getAiLanguageInstruction(lang),
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      response_format: { type: "json_object" },
    });

    const text = res.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(text) as {
      summary?: string;
      questions?: DoctorQuestion[];
    };
    return {
      summary:
        parsed.summary ||
        translate(lang, "report.doctorQuestions", "Suggested questions for your doctor visit based on your saved report."),
      questions: Array.isArray(parsed.questions) ? parsed.questions : [],
      aiModelUsed: process.env.OPENAI_MODEL || "gpt-4o-mini",
    };
  } catch {
    return generateMockDoctorQuestions(params);
  }
}
