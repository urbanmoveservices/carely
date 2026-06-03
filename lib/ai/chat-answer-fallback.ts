import {
  buildContextDigest,
  extractLabsFromContext,
  medicineHintsForLabs,
} from "@/lib/ai/chat-context-digest";
import type { ChatSourceRef } from "@/lib/ai/chat-context-builder";

const INSUFFICIENT_PHRASE =
  /enough saved report data nahi hai|cannot prescribe|do not prescribe|not prescribe|consult your doctor about your symptoms/i;

export function answerLooksInsufficient(answer: string): boolean {
  return INSUFFICIENT_PHRASE.test(answer);
}

function isHighLowQuestion(msg: string) {
  return /high|low|important|sabse|kaunse values|values/i.test(msg);
}

function isMedicineQuestion(msg: string) {
  return /dawa|medicine|dose|dosage|cure|tablet|ilaj|prescri/i.test(msg);
}

export function buildFallbackAnswer(
  message: string,
  context: Record<string, unknown>,
  mode: string
): string | null {
  const labs = extractLabsFromContext(context);
  const digest = buildContextDigest(context);
  const hasData = labs.length > 0 || digest.length > 80;

  if (!hasData) return null;

  if (isMedicineQuestion(message)) {
    const medHints = medicineHintsForLabs(labs);
    const labBlock =
      labs.length > 0
        ? labs
            .slice(0, 12)
            .map(
              (l) =>
                `• ${l.name}: ${l.value ?? "—"}${l.unit ? ` ${l.unit}` : ""}${l.status || l.severity ? ` (${l.status || l.severity})` : ""}`
            )
            .join("\n")
        : digest;

    return `Aapke saved report ke hisaab se:\n\n${labBlock}\n\n**Dawai aur dose (doctor se confirm kar lena):**\n${medHints || "Report pattern ke liye doctor aapko exact medicine choose karenge — neeche values doctor ko dikhana."}\n\nNote: Ye aapke uploaded data + common clinical practice par based hai.`;
  }

  if (isHighLowQuestion(message) || mode === "report") {
    const highs = labs.filter((l) =>
      /high|elevated|above|bad/i.test(`${l.status || ""} ${l.severity || ""}`)
    );
    const lows = labs.filter((l) =>
      /low|below|deficient/i.test(`${l.status || ""} ${l.severity || ""}`)
    );

    const report =
      (context.report as Record<string, unknown> | undefined) ||
      (context.latestReport as Record<string, unknown> | undefined);
    const summaryBit = report?.summary
      ? `**Report summary:** ${String(report.summary).slice(0, 500)}\n\n`
      : "";

    let body = summaryBit + "**High / abnormal values:**\n";
    if (highs.length) {
      body += highs
        .map(
          (l) =>
            `• ${l.name}: ${l.value ?? "?"}${l.unit ? ` ${l.unit}` : ""}${l.normalRange ? ` (ref ${l.normalRange})` : ""}`
        )
        .join("\n");
    } else if (labs.length) {
      body += labs
        .slice(0, 10)
        .map((l) => `• ${l.name}: ${l.value ?? "?"}${l.unit ? ` ${l.unit}` : ""}`)
        .join("\n");
    } else {
      body += digest;
    }

    body += "\n\n**Low values:**\n";
    body +=
      lows.length > 0
        ? lows
            .map((l) => `• ${l.name}: ${l.value ?? "?"}${l.unit ? ` ${l.unit}` : ""}`)
            .join("\n")
        : "Koi clearly marked low value nahi — details upar.";

    body +=
      "\n\n**Sabse important:** Jo values high/abnormal hain un par pehle doctor follow-up; lifestyle + medicines upar suggest kiye ja sakte hain.";

    return body;
  }

  return null;
}

export function applyAnswerQualityGate(params: {
  answer: string;
  message: string;
  context: Record<string, unknown>;
  mode: string;
  sources: ChatSourceRef[];
}): string {
  if (!answerLooksInsufficient(params.answer)) return params.answer;
  const fallback = buildFallbackAnswer(params.message, params.context, params.mode);
  return fallback || params.answer;
}
