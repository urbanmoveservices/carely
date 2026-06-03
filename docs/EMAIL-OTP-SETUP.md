# Email (SMTP + OTP)

Vaidya GPT sends **6-digit OTP codes** for email verification and password reset from:

`SMTP_FROM="Vaidya GPT <support@vaidya-gpt.com>"`

Set `SUPPORT_EMAIL=support@vaidya-gpt.com` for templates and footers.

## Environment

See `.env.example` for:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `OTP_EXPIRES_MINUTES` (default 10)
- `OTP_RESEND_COOLDOWN_SECONDS` (default 60)
- `OTP_MAX_ATTEMPTS` (default 5)
- `DEV_PRINT_OTP=false` (dev only — logs OTP to server console when true)

If SMTP is not configured in development, signup and auth still work; the server logs `Email not sent: SMTP not configured`.

## Deliverability (production)

Configure your SMTP provider (Zoho Mail, Resend, Amazon SES, Mailgun, Brevo, Gmail Workspace, etc.) and add DNS records for your sending domain:

| Record | Purpose |
|--------|---------|
| **SPF** | Authorize your SMTP provider to send for `@vaidya-gpt.com` |
| **DKIM** | Cryptographic signature for outbound mail |
| **DMARC** | Policy for SPF/DKIM alignment and reporting |

Use the provider’s dashboard to generate SPF/DKIM values. Do not hardcode provider-specific settings in the app.

## API routes

| Route | Purpose |
|-------|---------|
| `POST /api/auth/email/send-code` | Send verification OTP (logged in) |
| `POST /api/auth/email/verify-code` | Verify email with 6-digit code |
| `POST /api/auth/password/forgot` | Request password reset OTP |
| `POST /api/auth/password/reset-with-code` | Reset password with OTP |

Legacy link-based routes (`/api/auth/send-verification`, `/api/auth/forgot-password`, token verify) remain for compatibility but OTP is the primary flow.

## E2E testing

With `E2E_ALLOW_TEST_HELPERS=true` and `NODE_ENV !== production`:

`GET /api/test/latest-otp?email=user@vaidya.test&type=email_verification`

Only works for `@vaidya.test` addresses. Never enable in production.
