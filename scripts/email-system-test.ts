/**
 * Email system unit tests
 * Run: npm run test:email-system
 */
import { sanitizeEmailSubject, isSubjectHealthSafe } from "../lib/email/privacy";
import { canSendEmail, getOrCreateEmailPreference } from "../lib/email/preferences";
import { hashUnsubscribeToken } from "../lib/email/unsubscribe";
import { renderBrandedTemplate } from "../lib/email/templates-branded";
import prisma from "../lib/prisma";

let failed = 0;

function ok(name: string) {
  console.log(`OK ${name}`);
}
function fail(name: string, detail?: string) {
  console.error(`FAIL ${name}${detail ? `: ${detail}` : ""}`);
  failed++;
}

async function main() {
  const badSubject = "Your TSH is high — diabetes risk";
  const clean = sanitizeEmailSubject(badSubject);
  if (isSubjectHealthSafe(badSubject)) {
    fail("subject_sanitized_unsafe");
  } else {
    ok("subject_sanitized_unsafe");
  }
  if (!isSubjectHealthSafe(clean)) {
    fail("subject_clean_safe", clean);
  } else {
    ok("subject_clean_safe");
  }

  const ready = renderBrandedTemplate("ai_summary_ready", {
    name: "Test",
    reportLink: "https://example.com/reports/1",
  });
  if (/\b(tsh|ldl|high|low|diabetes)\b/i.test(ready.subject)) {
    fail("summary_ready_subject_safe");
  } else {
    ok("summary_ready_subject_safe");
  }
  if (/\b11\.4\b|\bTSH\b/i.test(ready.html)) {
    fail("summary_ready_body_no_labs");
  } else {
    ok("summary_ready_body_no_labs");
  }

  const hash = hashUnsubscribeToken("test-token-abc");
  if (hash.length !== 64) fail("unsubscribe_hash");
  else ok("unsubscribe_hash");

  const user = await prisma.user.findFirst({ select: { id: true } });
  if (user) {
    await getOrCreateEmailPreference(user.id);
    await prisma.emailPreference.update({
      where: { userId: user.id },
      data: { marketingEnabled: false },
    });
    const blocked = await canSendEmail({
      userId: user.id,
      category: "marketing",
      templateKey: "pro_plan_promo",
    });
    if (blocked.allowed) fail("marketing_blocked_when_opted_out");
    else ok("marketing_blocked_when_opted_out");

    const txn = await canSendEmail({
      userId: user.id,
      category: "transactional",
      templateKey: "email_verification_otp",
    });
    if (!txn.allowed) fail("transactional_always_allowed");
    else ok("transactional_always_allowed");
  } else {
    ok("preference_tests_skipped_no_user");
  }

  console.log(failed ? `\n${failed} failed` : "\nAll email system tests passed");
  await prisma.$disconnect();
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
