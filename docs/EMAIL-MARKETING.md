# Vaidya GPT — Email system

Operator: UrbanMove Services Private Limited  
Sender: support@vaidya-gpt.com

## SMTP (Hostinger / production)

```env
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=support@vaidya-gpt.com
SMTP_PASS=
SMTP_FROM="Vaidya GPT <support@vaidya-gpt.com>"
SUPPORT_EMAIL=support@vaidya-gpt.com
```

## DNS (required for deliverability)

Configure for `vaidya-gpt.com`:

- **SPF** — authorize your SMTP host to send mail
- **DKIM** — sign outbound messages
- **DMARC** — policy for failed authentication

## Automation worker

```bash
npm run email:run
```

Cron (VPS):

```cron
*/10 * * * * cd /var/www/vaidya-gpt && npm run email:run
```

## Marketing

Keep `EMAIL_MARKETING_ENABLED=false` until:

1. SPF/DKIM/DMARC are configured
2. Unsubscribe links are tested (`/unsubscribe`)
3. Admin test campaign works (`/admin/email-marketing`)

## Privacy

Email subjects and previews must not contain lab values, diagnoses, or marker names. Report emails link back to the secure app only.

## User preferences

Users manage optional emails at `/settings/email-preferences`.

Transactional emails (OTP, payment receipts) always send when required.
