import { existsSync } from "fs";
import path from "path";
import { BRAND } from "@/lib/brand";
import { absoluteUrl } from "@/lib/app-url";

export const EMAIL_LOGO_CID = "vaidya-gpt-logo";

export type EmailLogoAsset = {
  cid: string;
  path: string | null;
  url: string;
};

export function resolveEmailLogo(): EmailLogoAsset {
  const candidates = [
    path.join(process.cwd(), "public", "brand", "logo.png"),
    path.join(process.cwd(), "public", "logo.png"),
    path.join(process.cwd(), "logo.png"),
  ];
  const found = candidates.find((p) => existsSync(p)) ?? null;

  let url: string = BRAND.logo;
  try {
    url = absoluteUrl(BRAND.logo);
  } catch {
    // APP_URL may be unset in some dev scripts; img src falls back to cid attachment.
  }

  return { cid: EMAIL_LOGO_CID, path: found, url };
}

export function logoAttachmentForNodemailer(logo: EmailLogoAsset) {
  if (!logo.path) return [];
  return [
    {
      filename: "logo.png",
      path: logo.path,
      cid: logo.cid,
      contentDisposition: "inline" as const,
    },
  ];
}
