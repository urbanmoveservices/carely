# Vaidya GPT — Manual QA checklist

Use the in-app checklist at **http://localhost:7111/admin/qa-checklist** (admin login) for pass/fail tracking.

## Quick smoke (5 min)

1. Homepage shows **Vaidya GPT** and logo.
2. Login → dashboard → upload (single PDF or image).
3. Document reaches text extracted → generate summary (OpenAI key set).
4. Report page: summary, PDF download.
5. `/admin/system-health` — database and OpenAI OK.

## Multi-image upload

| Plan | Max image pages per report | Monthly uploads |
|------|---------------------------|-----------------|
| Free | 3 | Plan limit |
| Pro / Family | 20 | Plan limit |

- One multi-image upload = **one** monthly upload.
- 4th image on Free → blocked with upgrade message.
- Upload UI states OpenAI Vision OCR.

## OCR / Tesseract

- Default: **OpenAI Vision** only.
- `ENABLE_TESSERACT_OCR=false` — server must stay up if Tesseract data is missing.
- Re-run OCR from document actions when available.

## AI summary (no mock in production flow)

- [ ] `MOCK_AI_MODE` is not `true` in production `.env`
- [ ] Missing `OPENAI_API_KEY` → clear message, no report saved
- [ ] Short/missing text → `TEXT_NOT_READY`, no report saved
- [ ] Two different uploads → different summaries (not identical boilerplate)

## Security spot-check

- [ ] Open another user’s report URL while logged in as user A → denied
- [ ] Revoked doctor share link → denied
- [ ] Error logs in admin contain no passwords or full lab text

## Before demo / production

```bash
npm run build
npm run test:smoke
npm run prod:check
```

Hard refresh browser (Ctrl+Shift+R) and unregister service worker if icons or name look stale.
