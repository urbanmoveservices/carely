export type EnvCheck = { key: string; ok: boolean; required: boolean; message?: string };

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getRequiredProductionEnv(): string[] {
  return [
    "DATABASE_URL",
    "JWT_SECRET",
    "OPENAI_API_KEY",
    "NEXT_PUBLIC_APP_URL",
  ];
}

export function getRecommendedProductionEnv(): string[] {
  return [
    "FILE_ENCRYPTION_KEY",
    "SMTP_HOST",
    "SMTP_FROM",
    "VAPID_PUBLIC_KEY",
    "VAPID_PRIVATE_KEY",
  ];
}

export function validateEnv(): EnvCheck[] {
  const checks: EnvCheck[] = [];
  const required = isProduction() ? getRequiredProductionEnv() : ["DATABASE_URL"];

  for (const key of required) {
    const val = process.env[key]?.trim();
    checks.push({
      key,
      ok: Boolean(val),
      required: true,
      message: val ? undefined : "Missing",
    });
  }

  for (const key of getRecommendedProductionEnv()) {
    const val = process.env[key]?.trim();
    checks.push({
      key,
      ok: Boolean(val),
      required: false,
      message: val ? undefined : "Not configured (optional in dev)",
    });
  }

  return checks;
}

export function assertProductionEnv(): void {
  if (!isProduction()) return;
  const failed = validateEnv().filter((c) => c.required && !c.ok);
  if (failed.length > 0) {
    throw new Error(
      `Missing required env: ${failed.map((f) => f.key).join(", ")}`
    );
  }
}

export function isFileEncryptionConfigured(): boolean {
  return Boolean(process.env.FILE_ENCRYPTION_KEY?.trim());
}

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_FROM?.trim()
  );
}

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY?.trim() &&
      process.env.VAPID_PRIVATE_KEY?.trim()
  );
}

export function isRazorpayEnvEnabled(): boolean {
  return process.env.RAZORPAY_ENABLED === "true";
}

export function getRazorpayEnvChecks(): EnvCheck[] {
  if (!isRazorpayEnvEnabled()) {
    return [
      {
        key: "razorpay",
        ok: true,
        required: false,
        message: "RAZORPAY_ENABLED is not true (paid upgrades disabled)",
      },
    ];
  }

  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  const publicKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
  const webhook = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();

  const checks: EnvCheck[] = [
    {
      key: "RAZORPAY_KEY_ID",
      ok: Boolean(keyId),
      required: true,
      message: keyId ? undefined : "Missing",
    },
    {
      key: "RAZORPAY_KEY_SECRET",
      ok: Boolean(keySecret),
      required: true,
      message: keySecret ? undefined : "Missing",
    },
    {
      key: "NEXT_PUBLIC_RAZORPAY_KEY_ID",
      ok: Boolean(publicKey),
      required: true,
      message: publicKey ? undefined : "Missing",
    },
    {
      key: "RAZORPAY_WEBHOOK_SECRET",
      ok: Boolean(webhook),
      required: isProduction(),
      message: webhook
        ? undefined
        : isProduction()
          ? "Required in production"
          : "Recommended for webhooks in dev",
    },
  ];

  return checks;
}
