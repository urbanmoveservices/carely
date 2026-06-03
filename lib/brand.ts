/** Brand assets and display names — use for logos and PWA metadata. */

export const BRAND = {
  name: "Vaidya GPT",
  previousName: "Carely-Med Gen AI",
  operator: "UrbanMove Services Private Limited",
  logo: "/brand/logo.png",
  logoAlt: "Vaidya GPT logo",
  shortName: "VaidyaGPT",
  description:
    "AI-assisted medical diagnosis, treatment guidance, and family health assistant.",
  favicon: "/favicon.ico",
  icon192: "/icons/icon-192.png",
  icon512: "/icons/icon-512.png",
} as const;

export { MEDICAL_DISCLAIMER } from "@/lib/disclaimers";

export function getAppDisplayName(): string {
  return process.env.NEXT_PUBLIC_APP_NAME?.trim() || BRAND.name;
}
