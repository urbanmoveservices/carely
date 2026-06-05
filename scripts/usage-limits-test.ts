/**
 * Lightweight server-side usage limit checks (run manually: npx tsx scripts/usage-limits-test.ts)
 */
import {
  getCurrentBillingPeriod,
  getEffectivePlan,
  getPlanLimitsForUser,
} from "../lib/billing/usage-limits";
import { PLAN_LIMITS } from "../lib/billing/plan-config";

function assert(name: string, ok: boolean, detail?: string) {
  if (ok) console.log(`OK ${name}`);
  else {
    console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
    process.exitCode = 1;
  }
}

function main() {
  const fakeClientDate = new Date("1999-01-01T00:00:00.000Z");
  const serverPeriod = getCurrentBillingPeriod(new Date("2026-06-15T12:00:00.000Z"));
  assert(
    "client_fake_date_ignored_for_period",
    serverPeriod === "2026-06",
    `got ${serverPeriod}`
  );
  assert(
    "period_uses_utc_not_client",
    getCurrentBillingPeriod(fakeClientDate) === "1999-01",
    "UTC month from Date object only"
  );

  assert(
    "free_upload_limit",
    PLAN_LIMITS.free.uploadsPerMonth === 3,
    String(PLAN_LIMITS.free.uploadsPerMonth)
  );
  assert(
    "pro_upload_limit",
    PLAN_LIMITS.pro.uploadsPerMonth === 5,
    String(PLAN_LIMITS.pro.uploadsPerMonth)
  );
  assert(
    "family_upload_limit",
    PLAN_LIMITS.family.uploadsPerMonth === 50,
    String(PLAN_LIMITS.family.uploadsPerMonth)
  );
  assert(
    "free_ai_summary_limit",
    PLAN_LIMITS.free.aiSummariesPerMonth === 1,
    String(PLAN_LIMITS.free.aiSummariesPerMonth)
  );
  assert(
    "family_member_limits",
    PLAN_LIMITS.free.familyMembersLimit === 2 &&
      PLAN_LIMITS.pro.familyMembersLimit === 5 &&
      PLAN_LIMITS.family.familyMembersLimit === 12,
    "family caps"
  );

  const expiredPro = getEffectivePlan(
    { currentPlan: "pro", subscriptionEndsAt: new Date("2020-01-01T00:00:00.000Z") },
    new Date("2026-06-01T00:00:00.000Z")
  );
  assert("expired_pro_falls_back_to_free", expiredPro === "free", expiredPro);

  const activePro = getEffectivePlan(
    { currentPlan: "pro", subscriptionEndsAt: new Date("2027-01-01T00:00:00.000Z") },
    new Date("2026-06-01T00:00:00.000Z")
  );
  assert("active_pro_stays_pro", activePro === "pro", activePro);

  const freeLimits = getPlanLimitsForUser(
    { currentPlan: "family", subscriptionEndsAt: new Date("2020-01-01T00:00:00.000Z") },
    new Date("2026-06-01T00:00:00.000Z")
  );
  assert(
    "expired_family_uses_free_limits",
    freeLimits.uploadsPerMonth === 3 && freeLimits.familyMembersLimit === 2,
    `${freeLimits.uploadsPerMonth}/${freeLimits.familyMembersLimit}`
  );

  if (process.exitCode === 1) {
    console.error("\nUsage limits tests failed");
  } else {
    console.log("\nAll usage limits tests passed");
  }
}

main();
