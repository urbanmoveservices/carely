import { PRODUCT_NAME, COMPANY_NAME, getSupportEmail } from "@/lib/company";
import { EMAIL_LOGO_CID, type EmailLogoAsset } from "@/lib/email/logo-attachment";

const BRAND_TEAL = "#0d9488";
const BRAND_DARK = "#0f172a";

export function wrapBrandedEmailHtml(params: {
  logo: EmailLogoAsset;
  preheader: string;
  title: string;
  bodyHtml: string;
}): string {
  const logoSrc = params.logo.path ? `cid:${EMAIL_LOGO_CID}` : params.logo.url;
  const support = getSupportEmail();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${params.title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Roboto,Arial,sans-serif;color:${BRAND_DARK};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${params.preheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND_TEAL},#0891b2);padding:28px 32px;text-align:center;">
              <img src="${logoSrc}" alt="${PRODUCT_NAME} logo" width="168" height="auto" style="display:block;margin:0 auto 12px;max-width:168px;height:auto;border:0;" />
              <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.2px;">${PRODUCT_NAME}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${params.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;">
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 16px;" />
              <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;text-align:center;">
                ${PRODUCT_NAME}<br />
                Operated by ${COMPANY_NAME}<br />
                Support: <a href="mailto:${support}" style="color:${BRAND_TEAL};text-decoration:none;">${support}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function otpCodeBlock(code: string, expiryMinutes: number): string {
  return `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">Your one-time code:</p>
    <div style="text-align:center;margin:24px 0;">
      <div style="display:inline-block;background:#f0fdfa;border:2px dashed ${BRAND_TEAL};border-radius:12px;padding:18px 28px;">
        <span style="font-size:34px;font-weight:700;letter-spacing:10px;color:${BRAND_DARK};font-family:Consolas,Monaco,monospace;">${code}</span>
      </div>
    </div>
    <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#475569;">
      This code expires in <strong>${expiryMinutes} minutes</strong>.
    </p>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#64748b;">
      If you did not request this, you can safely ignore this email. Do not share this code with anyone.
    </p>`;
}
