/**
 * Unit tests for AI token optimization layer.
 * Run: npm run test:ai-optimization
 */
import { readFile } from "fs/promises";
import path from "path";
import { parseLabValuesFromText } from "../lib/lab-value-parser";
import { buildCompactReportContext } from "../lib/ai/compact-report-context";
import { repairReportSummary } from "../lib/ai/report-summary-repair";
import {
  validateRecommendationCounts,
  validateReportSummary,
} from "../lib/ai/report-summary-validator";
import {
  RECOMMENDATION_MAX,
  RECOMMENDATION_MIN,
  ensureRecommendationCounts,
} from "../lib/ai/recommendation-limits";
import { formatWeatherForPrompt } from "../lib/weather/weather-context";
import prisma from "../lib/prisma";
import { buildResponseCacheHash, setCachedResponse, getCachedResponse } from "../lib/ai/context-cache";
import { selectChatHistory } from "../lib/ai/chat-thread-compression";
import { hashInput } from "../lib/ai/token-usage";
import { shouldAttachDebugStats } from "../lib/ai/compact-report-context";
import type { AiHealthContextBundle } from "../lib/report-context-service";

let failed = 0;

function ok(name: string) {
  console.log(`OK ${name}`);
}

function fail(name: string, detail?: string) {
  console.error(`FAIL ${name}${detail ? `: ${detail}` : ""}`);
  failed++;
}

async function main() {
  const fixture = await readFile(
    path.join(process.cwd(), "test-fixtures/download-digital-report-text.txt"),
    "utf8"
  );
  const structured = parseLabValuesFromText(fixture);
  const healthContext: AiHealthContextBundle = {
    skipped: false,
    questionnaire: { foodPreference: "vegetarian", physicalActivity: "moderate" },
    familyProfile: null,
  };

  const compact = await buildCompactReportContext({
    userId: "test-user",
    extractedText: fixture,
    healthContext,
    structuredLabValues: structured,
  });

  if (structured.length >= 3 && compact.promptText.includes(fixture.slice(0, 500))) {
    fail("compact_context_no_full_text", "full extracted text included when structured values exist");
  } else {
    ok("compact_context_no_full_text");
  }

  if (!compact.promptText.includes("STRUCTURED LAB VALUES")) {
    fail("compact_context_has_structured_block");
  } else {
    ok("compact_context_has_structured_block");
  }

  const weatherPrompt = formatWeatherForPrompt(null);
  if (!/do not invent/i.test(weatherPrompt)) {
    fail("weather_no_invent");
  } else {
    ok("weather_no_invent");
  }

  const longFood = Array.from({ length: 12 }, (_, i) => `Food tip ${i} with dal and roti`);
  const limited = ensureRecommendationCounts(longFood, longFood, longFood, structured);
  if (limited.foodRecommendations.length > RECOMMENDATION_MAX) {
    fail("food_max_7", `got ${limited.foodRecommendations.length}`);
  } else {
    ok("food_max_7");
  }

  const short = ensureRecommendationCounts([], [], [], structured);
  if (
    short.foodRecommendations.length < RECOMMENDATION_MIN ||
    short.exerciseRecommendations.length < RECOMMENDATION_MIN ||
    short.lifestyleAdvice.length < RECOMMENDATION_MIN
  ) {
    fail("recommendations_min_5");
  } else {
    ok("recommendations_min_5");
  }

  const hasIndian = short.foodRecommendations.some((l) =>
    /\b(dal|roti|rice|sabzi|curd|paneer|palak)\b/i.test(l)
  );
  if (!hasIndian) {
    fail("indian_diet_examples");
  } else {
    ok("indian_diet_examples");
  }

  const repaired = repairReportSummary(
    {
      summary: "Test",
      keyFindings: [],
      abnormalValues: [],
      foodRecommendations: longFood,
      exerciseRecommendations: longFood,
      lifestyleAdvice: longFood,
      riskFlags: [],
      chartData: [],
    },
    structured
  );
  if (!validateRecommendationCounts(repaired)) {
    fail("repair_enforces_5_7");
  } else {
    ok("repair_enforces_5_7");
  }

  const validation = validateReportSummary(repaired, structured);
  if (validation.issues.some((i) => i.code === "RECOMMENDATION_TOO_LONG")) {
    fail("validator_accepts_repaired");
  } else {
    ok("validator_accepts_repaired");
  }

  const hist = selectChatHistory({
    summary: "Prior discussion about TSH",
    messages: Array.from({ length: 12 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `message ${i}`,
    })),
  });
  if (hist.recent.length !== 4) {
    fail("chat_history_last_4", `got ${hist.recent.length}`);
  } else {
    ok("chat_history_last_4");
  }
  if (!hist.summary) {
    fail("chat_history_uses_summary");
  } else {
    ok("chat_history_uses_summary");
  }

  const cacheHashA = buildResponseCacheHash({
    userId: "u1",
    feature: "chat_report",
    reportId: "r1",
    question: "What is TSH?",
    contextHash: hashInput(["ctx"]),
    language: "en",
    model: "gpt-4o-mini",
  });
  const cacheHashB = buildResponseCacheHash({
    userId: "u1",
    feature: "chat_report",
    reportId: "r1",
    question: "What is TSH?",
    contextHash: hashInput(["ctx"]),
    language: "en",
    model: "gpt-4o-mini",
  });
  cacheHashA === cacheHashB ? ok("response_cache_hash_stable") : fail("response_cache_hash_stable");

  const testUser = await prisma.user.findFirst({ select: { id: true } });
  if (testUser) {
    const cacheOut = {
      answer: "cached answer",
      safetyLevel: "normal" as const,
      sources: [],
      suggestedQuestions: [],
    };
    await setCachedResponse({
      userId: testUser.id,
      type: "chat_report_test",
      inputHash: cacheHashA,
      output: cacheOut,
      ttlHours: 1,
    });
    const hit = await getCachedResponse<typeof cacheOut>({
      userId: testUser.id,
      type: "chat_report_test",
      inputHash: cacheHashA,
    });
    if (hit?.answer !== "cached answer") {
      fail("response_cache_hit");
    } else {
      ok("response_cache_hit");
    }
  } else {
    ok("response_cache_hit_skipped_no_user");
  }

  process.env.AI_DEBUG_CONTEXT = "false";
  if (shouldAttachDebugStats()) {
    fail("debug_stats_prod_blocked");
  } else {
    ok("debug_stats_prod_blocked");
  }

  process.env.AI_DEBUG_CONTEXT = "true";
  process.env.NODE_ENV = "development";
  if (!shouldAttachDebugStats()) {
    fail("debug_stats_dev_allowed");
  } else {
    ok("debug_stats_dev_allowed");
  }

  console.log(failed ? `\n${failed} test(s) failed` : "\nAll AI optimization tests passed");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
