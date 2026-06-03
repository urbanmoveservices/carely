# Razorpay Standard Checkout (Vaidya GPT)

Razorpay is **already integrated** in this Next.js app. No separate `/api/create-order` route — the project uses plan-based billing endpoints that follow the same Standard Checkout flow.

## Architecture

| Step | Endpoint | Purpose |
|------|----------|---------|
| Create order | `POST /api/billing/razorpay/create-order` | Creates Razorpay order (amount in paise), returns `orderId` |
| Verify payment | `POST /api/billing/razorpay/verify` | HMAC-SHA256 signature verification + plan activation |
| Webhook | `POST /api/billing/razorpay/webhook` | Optional server-side `payment.captured` handler |
| Status | `GET /api/billing/razorpay/status` | Config + webhook URL for admin |

## Environment variables

Add to `.env` (never commit real secrets):

```env
RAZORPAY_ENABLED=true
RAZORPAY_KEY_ID=rzp_test_xxxx
RAZORPAY_KEY_SECRET=your_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxx
RAZORPAY_CURRENCY=INR
RAZORPAY_WEBHOOK_SECRET=optional_for_webhooks
```

- `RAZORPAY_KEY_SECRET` stays **server-only**
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` is the public key id for Checkout.js (same value as `RAZORPAY_KEY_ID` in test mode)

On production server: edit `/var/www/carely/.env` and run `pm2 restart vaidya-gpt --update-env`.

## Key files

| File | Role |
|------|------|
| `lib/billing/razorpay.ts` | Order creation (Razorpay REST API), HMAC verify, plan activation |
| `lib/billing/razorpay-checkout.ts` | Loads `checkout.razorpay.com/v1/checkout.js` |
| `components/billing/RazorpayUpgradeButton.tsx` | Checkout modal, success handler, cancel/failed events |
| `app/billing/page.tsx` | Billing UI with upgrade buttons |
| `app/api/billing/razorpay/create-order/route.ts` | Authenticated create-order API |
| `app/api/billing/razorpay/verify/route.ts` | Signature verification API |

## How to test (local)

1. Set Razorpay env vars in `.env`
2. Start app: `npm run dev` (port 7111)
3. Sign up / log in
4. Complete profile with **phone number** (required for Razorpay prefill)
5. Open **http://localhost:7111/billing**
6. Click **Upgrade with Razorpay** on Pro or Family
7. Use Razorpay test card: `4111 1111 1111 1111`, any future expiry, any CVV
8. After payment, plan should activate and show success message

Verify config:

```bash
npm run prod:check
curl http://localhost:7111/api/billing/razorpay/status
```

## How to test (production)

1. Set keys in server `.env`
2. `pm2 restart vaidya-gpt --update-env`
3. Visit `https://vaidya-gpt.com/billing`
4. Register webhook in Razorpay Dashboard: `{APP_URL}/api/billing/razorpay/webhook`

## Signature verification

Server uses:

```text
HMAC-SHA256(order_id + "|" + payment_id, RAZORPAY_KEY_SECRET)
```

Implemented in `verifyRazorpayPaymentSignature()` in `lib/billing/razorpay.ts`. Mismatch returns **400** — payment is **not** marked paid.

## Plan amounts (INR, paise)

| Plan | Amount |
|------|--------|
| Pro | 900 (₹9) |
| Family | 24900 (₹249) |

Both exceed Razorpay minimum of 100 paise.

## Reference

- [Razorpay Standard Checkout docs](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/)
