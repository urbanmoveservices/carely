# Vaidya GPT

Full-stack Next.js medical AI SaaS application.

**Operator:** UrbanMove Services Private Limited

> **Note:** Vaidya GPT was previously developed under the working name *Carely-Med Gen AI*. The repository folder may still be named `carely-med-gen-ai` — that does not affect the product name shown in the app.

Upload medical reports and get AI-generated summaries, key findings, food recommendations, exercise suggestions, health insights, charts, and downloadable reports.

> **Medical disclaimer:** Vaidya GPT provides AI-assisted medical diagnosis and treatment guidance based on uploaded reports and health information. Seek urgent in-person care for emergencies.

> **Legal pages:** Development drafts at `/privacy`, `/terms`, `/disclaimer`, `/consent`, `/contact`, `/about`, and `/help` should be reviewed by qualified legal counsel before production use.

> **Compliance:** Not certified for HIPAA, GDPR, DPDP, or similar frameworks by default. Production deployment requires compliance review.

**Support (placeholder):** support@urbanmoveservices.com · **Legal (placeholder):** legal@urbanmoveservices.com

## Tech Stack

- **Frontend:** Next.js 14+ App Router, React, TypeScript, Tailwind CSS, Custom UI Components
- **Backend:** Next.js API Routes (no separate backend server)
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** JWT + bcryptjs
- **Charts:** Recharts
- **Icons:** Lucide React

No Docker required. No Python required. No shadcn/ui used. Uses local PostgreSQL/psql. Runs on port **7111**.

## Indian Regional Language Support

Vaidya GPT supports **23 Indian language options** (English plus 22 scheduled/regional languages) for UI and AI-assisted content.

- **UI translation:** Custom i18n dictionaries in `lib/i18n/` (`languages.ts`, `en.ts`, `hi.ts`, `regional.ts`, `translations.ts`) with `useTranslation()` / `I18nProvider`. Missing keys fall back to **English**.
- **User preference:** `UserPreference.language` (default `en`), synced via `GET/PATCH /api/preferences` and `localStorage` key `carely_language`.
- **Language selector:** `components/LanguageSelector.tsx` on landing nav, mobile menu, settings, onboarding profile, and legal pages.
- **AI summaries & doctor questions:** Generated in the user’s selected language when not English (medical test names/units may stay in English).
- **PDF:** Section labels use the user’s language where available; saved AI text stays as generated.
- **RTL:** Basic `dir="rtl"` support for Urdu (`ur`), Sindhi (`sd`), and Kashmiri (`ks`).
- **Legal:** Legal page body may remain English initially; `legal.translationNote` warns that translations need legal review before production.
- **Admin:** User list/detail shows preferred language (admin UI remains English).

## Full-page translation system

Static i18n dictionaries cover known UI labels. **OpenAI** translates the rest of the visible page (dashboard, legal/help pages, saved reports) and generates AI summaries in the selected language when possible.

### Architecture

| Layer | Role |
|--------|------|
| `lib/i18n/*` | Static keys (`t()`, regional dictionaries) |
| `lib/translation/openai-translation-provider.ts` | OpenAI text/batch/object translation |
| `lib/translation/*` | Cache, skip rules, `translateObject`, mock UI fallback (dev only) |
| `POST /api/translate/text`, `/batch`, `/object` | Authenticated APIs (batch max 100 strings, 20k chars) |
| `components/translation/PageTranslator.tsx` | DOM fallback via `/api/translate/batch` (debounced, in-memory + DB cache) |
| `lib/report-translation.ts` | Structured report translation (summary, findings, recommendations, risk flags) |
| `ReportTranslation` (Prisma) | Per-report language cache |
| `TranslationCache` (Prisma) | Per-phrase cache keyed by hash + `context` |

### Provider

**OpenAI only** (`OPENAI_API_KEY`). Model: `OPENAI_TRANSLATION_MODEL` (default `gpt-4o-mini`).  
Without a key, limited **mock** Hindi UI labels apply; medical content is not translated.

```env
OPENAI_API_KEY=
OPENAI_TRANSLATION_MODEL=gpt-4o-mini
```

### Medical privacy consent

`UserPreference.allowCloudTranslation` (Settings → **AI Translation Privacy**).  
Static UI and legal pages translate without this toggle. Report/medical object translation requires consent because text is sent to OpenAI.

### Supported Indian languages

`en`, `hi`, `bn`, `te`, `mr`, `ta`, `ur`, `gu`, `kn`, `or`, `ml`, `pa`, `as`, `mai`, `sa`, `kok`, `mni`, `ne`, `sd`, `doi`, `brx`, `ks`, `sat` — prompted by language name. RTL: `ur`, `sd`, `ks`.

### Cost control

Batch requests, SHA256 DB cache (with `context`), skip rules for IDs/URLs/units, 700ms PageTranslator debounce, no toast translation, client `Map` cache.

### Testing

1. `npx prisma migrate dev --name openai_translation_cache` and `npx prisma generate`  
2. App at `http://localhost:7111`  
3. Select Hindi — dashboard UI translates via OpenAI (no refresh)  
4. Open a report — enable **Allow AI translation of medical content** in Settings  
5. Report summary/recommendations load via `GET /api/reports/{id}/translated?language=hi`  
6. PDF: `GET /api/reports/{id}/pdf?language=hi`

### Troubleshooting (text stays English)

- Confirm `OPENAI_API_KEY` is set  
- Enable **AI Translation Privacy** for report content  
- Check browser network for `POST /api/translate/batch` (503 = key missing)  
- Clear cache: `DELETE FROM "TranslationCache";` or refresh after schema migrate  

Admin status: `/admin/translation`

## Document Upload

### Supported formats

- PDF (.pdf)
- JPEG (.jpg, .jpeg)
- PNG (.png)
- DOCX (.docx)

### Max upload size

Configurable via `MAX_UPLOAD_MB` in `.env` (default: **10MB**).

### Local storage

Uploaded files are stored at:

```
storage/uploads/{userId}/{documentId}/filename
```

### Security

- File extensions and MIME types are validated server-side
- Executable files are rejected
- Filenames are sanitized (path traversal prevention)
- `storagePath` is never exposed to the frontend or API responses
- Users can only access their own documents
- Admin APIs require admin role

> **Medical Privacy Notice:** This local MVP stores uploaded files on the local machine. For production, use encrypted object storage, audit logs, strict access control, and compliant hosting.

## Text Extraction (Phase 3)

After upload, text is automatically extracted from documents:

- **PDF** — text extraction via `pdf-parse`
- **DOCX** — text extraction via `mammoth`
- **JPG/JPEG/PNG** — OCR via `tesseract.js` (English)

### Document status lifecycle

```
uploaded → processing → text_extracted → ai_completed
                      ↘ failed
```

| Status | Meaning |
|--------|---------|
| `uploaded` | File saved, extraction queued |
| `processing` | Text extraction in progress |
| `text_extracted` | Text extracted, ready for AI |
| `ai_completed` | AI summary generated |
| `failed` | Extraction or processing error |

### Troubleshooting extraction

PDF extraction can fail when:
- **Scanned/image-only PDF** — No selectable text layer. Upload as JPG/PNG for OCR instead
- **Password-protected PDF** — Locked PDFs cannot be read. Upload an unlocked copy
- **Missing text layer** — Some PDFs contain only images. Use JPG/PNG OCR upload
- **Corrupted PDF** — Damaged files will fail. Re-export or re-scan the document
- **Blurry images** — Low-resolution scans may produce poor OCR results

Recommended fixes:
- Upload the report as JPG or PNG for OCR text extraction (via tesseract.js)
- Upload a text-based PDF (from a digital report, not a photo scan)
- Upload DOCX if available — most reliable text extraction
- Use a clearer, higher-resolution scan

Retry extraction:
- Failed documents show a **Try Again** button on the document detail page and dashboard
- Retry calls `POST /api/documents/[id]/extract-text` to reprocess the same file
- Minimum 30 characters of extracted text required for success

## AI Summary Generation (Phase 4)

After text extraction, users can generate an AI-powered medical summary.

### How it works

1. User clicks **Generate AI Summary** on a document with status `text_extracted`
2. The app sends the extracted text to OpenAI (or uses mock mode)
3. AI returns a structured JSON response with findings, recommendations, and charts
4. A `Report` is created in the database
5. Document status becomes `ai_completed`
6. User can view the full report at `/reports/[id]`

### AI Modes

| Mode | Condition | Behavior |
|------|-----------|----------|
| **Mock** | `MOCK_AI_MODE=true` or no `OPENAI_API_KEY` | Returns realistic mock summary (no external calls) |
| **OpenAI** | `OPENAI_API_KEY` set and `MOCK_AI_MODE=false` | Calls OpenAI GPT-4o-mini with structured JSON output |

### Report Contents

- **Summary** — Plain language explanation of the medical report
- **Key Findings** — Important values with normal/low/high/critical status
- **Abnormal Values** — Values outside normal ranges with severity
- **Health Score** — 0–100 overall health indicator
- **Food Recommendations** — Dietary suggestions based on findings
- **Exercise Recommendations** — Activity suggestions
- **Lifestyle Advice** — General health and wellness tips
- **Risk Flags** — Warnings for concerning values
- **Charts** — Visual bar chart of health metrics vs normal ranges (Recharts)

### Environment Variables

```
OPENAI_API_KEY=sk-...        # Optional: OpenAI API key
MOCK_AI_MODE=true            # Set to "false" to use real OpenAI
```

### Medical Safety

- The AI does **not** diagnose, prescribe, or provide emergency advice
- All reports include a medical disclaimer
- Abnormal and critical values recommend consulting a healthcare professional
- Users should always verify results with a qualified doctor

### Troubleshooting

- **"AI summary could not be generated"** — Check if `OPENAI_API_KEY` is valid, or set `MOCK_AI_MODE=true`
- **"AI returned invalid JSON"** — Retry; rare issue with OpenAI output formatting
- **"Text extraction is not completed yet"** — Wait for document status to reach `text_extracted`
- **"This document already has a report"** — Each document can only have one report
- **Report shows mock data** — Ensure `MOCK_AI_MODE=false` and `OPENAI_API_KEY` is set

## PDF Report Export (Phase 5)

Users and admins can download AI medical summary reports as professional PDF files.

### How it works

1. Open a report at `/reports/[id]`
2. Click **Download PDF**
3. A PDF file is generated server-side and downloaded to the browser

### PDF Contents

- App name and header
- Report metadata (ID, document name, generated date)
- Medical disclaimer
- Health score (if available)
- AI summary
- Key findings with status indicators
- Abnormal values with severity
- Recommendations (food, exercise, lifestyle)
- Risk flags
- Health metrics data table
- Page numbers and footer

### API Routes

| Route | Access | Description |
|-------|--------|-------------|
| `GET /api/reports/[id]/pdf` | User (owner only) | Download own report as PDF |
| `GET /api/admin/reports/[id]/pdf` | Admin only | Download any report as PDF |

### Security

- PDF is generated from saved report data only — no raw uploaded files are included
- `storagePath` never appears in the PDF
- Users can only download their own reports
- Admin route requires admin role
- Medical disclaimer is always included

### Troubleshooting

- **"PDF could not be generated"** — Retry; check server logs for pdfkit errors
- **Download not starting** — Ensure you are logged in and have access to the report
- **Blank or corrupted PDF** — Clear browser cache and retry

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [PostgreSQL](https://www.postgresql.org/) (v14+)

## Setup

### 1. Create the database

```bash
psql -U postgres
```

Inside psql:

```sql
CREATE DATABASE carely_med_gen_ai;
\l
\q
```

### 2. Configure environment

Edit `.env` and set your PostgreSQL password:

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/carely_med_gen_ai"
JWT_SECRET="change-this-secret"
```

### 3. Install and run

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run admin:create
npm run dev
```

### 4. Open the app

- **App:** [http://localhost:7111](http://localhost:7111)
- **Admin Login:** [http://localhost:7111/admin/login](http://localhost:7111/admin/login)

### Default admin credentials (from .env)

- **Email:** admin@carelymed.ai
- **Password:** Admin@12345

> **Security:** Change the default admin password before deploying to production.

## Quick Start (Windows)

```
.\start-carely.bat
```

## Stop

```
.\stop-carely.bat
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 7111 |
| `npm run build` | Build for production |
| `npm run start` | Start production server on port 7111 |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run admin:create` | Create admin user from .env |

## Project Structure

```
carely-med-gen-ai/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/                # API routes (auth, documents, admin)
│   ├── admin/              # Admin panel pages
│   ├── dashboard/          # User dashboard
│   ├── login/              # Login page
│   ├── signup/             # Signup page
│   ├── upload/             # Document upload (drag-and-drop)
│   ├── reports/            # AI report detail page (Recharts)
│   └── settings/           # User settings
├── components/             # React components
│   ├── ui/                 # Custom UI component system
│   └── admin/              # Admin-specific components
├── lib/                    # Utilities (prisma, jwt, auth, storage, etc.)
├── prisma/                 # Prisma schema & migrations
├── scripts/                # Admin creation script
├── types/                  # TypeScript type definitions
├── storage/uploads/        # Uploaded medical documents (local)
└── public/                 # Static assets
```

## Multi-image report upload

Upload several report photos (JPG/PNG/WEBP) as **one** document. Page order matters — arrange pages before uploading.

| Plan | Max image pages per report | Monthly upload count |
|------|---------------------------|----------------------|
| Free | 3 | 1 report (all pages together) |
| Pro / Family | 20 | 1 report (all pages together) |

- Combined OCR text uses `--- Page N: filename ---` markers between pages.
- AI summary uses the merged `Document.extractedText`.
- **Image OCR uses OpenAI Vision by default** (`OPENAI_API_KEY`, `OPENAI_OCR_MODEL`, default `gpt-4o-mini`).
- Tesseract is **disabled by default** (`ENABLE_TESSERACT_OCR=false`). Enable only if you install language data.

```env
OPENAI_IMAGE_OCR_PROVIDER=openai
OPENAI_OCR_MODEL=gpt-4o-mini
ENABLE_TESSERACT_OCR=false
# Optional fallback only:
# ENABLE_TESSERACT_OCR=true
# TESSERACT_LANG_PATH=...
```

### Troubleshooting image OCR

If OCR fails, confirm `OPENAI_API_KEY` is set and restart the dev server.

Optional Tesseract (not required): set `ENABLE_TESSERACT_OCR=true` and ensure `eng.traineddata.gz` exists under `TESSERACT_LANG_PATH` or `node_modules/tesseract.js-core`. Missing traineddata will **not** crash the server.

API: `POST /api/documents/upload` with `uploadMode=multi_image` and repeated `files` fields. Re-OCR: `POST /api/documents/[id]/rerun-ocr`.

## Production platform (non-payment upgrade)

No Razorpay/Stripe in this phase. Mock billing plans remain for UI only.

| Module | Routes / scripts |
|--------|-------------------|
| System health | `/admin/system-health`, `GET /api/admin/system-health` |
| QA checklist | `/admin/qa-checklist` |
| Error logs | `/admin/error-logs`, `ErrorLog` model |
| Background jobs | `/jobs`, `/admin/jobs`, `npm run jobs:worker` |
| Manual lab values | `/documents/[id]/review-values` |
| Report chat | `/reports/[id]/chat` |
| Family health chat | `/health-chat` |
| Data export / delete | `/settings/data` |
| File encryption | `FILE_ENCRYPTION_KEY`, `npm run files:encrypt-existing` |
| Email | SMTP env vars, `/admin/email-logs` |
| Push | VAPID keys, `/api/push/*` |
| Doctor visit pack | `/reports/[id]/doctor-pack` |
| Support tickets | `/help/tickets`, `/admin/tickets` |
| Access logs | `/settings/security` |
| Production check | `npm run prod:check` |

**Migration:** `npx prisma migrate dev --name production_non_payment_upgrade`

**Worker:** Run `npm run jobs:worker` in a separate process (or cron hitting `POST /api/jobs/worker/run` with `JOB_WORKER_SECRET`).

## Production Hardening (Phase 6)

### Security Features

- **Secure HTTP headers** — `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and `Content-Security-Policy` via `next.config.js`
- **Rate limiting** — In-memory token-bucket rate limiter on all API routes (signup, login, upload, AI, PDF, admin)
- **Audit logging** — All user and admin actions are logged to `AuditLog` table with actor, action, entity, IP address, and user agent
- **Account controls** — Admins can deactivate/reactivate user accounts; disabled users cannot login
- **Password change** — Users can change their password from the Settings page
- **Profile update** — Users can update their display name
- **Environment validation** — `lib/env.ts` validates required environment variables and warns about weak configs
- **Centralized API errors** — `lib/api-response.ts` provides consistent JSON error responses

### Rate Limits

| Route | Limit | Window |
|-------|-------|--------|
| Signup | 5 requests | 10 minutes per IP |
| Login | 10 requests | 10 minutes per IP |
| Admin Login | 5 requests | 10 minutes per IP |
| Document Upload | 10 uploads | 1 hour per user |
| Generate AI Summary | 20 requests | 24 hours per user |
| PDF Download | 50 downloads | 24 hours per user |
| Admin APIs | 300 requests | 10 minutes per admin |

> **Note:** In-memory rate limiting is fine for local/MVP use. Production should use Redis/Upstash or provider-level rate limiting.

### Audit Logs

All key user and admin actions are logged:

**User events:** `USER_SIGNUP`, `USER_LOGIN`, `PASSWORD_CHANGED`, `PROFILE_UPDATED`, `DOCUMENT_UPLOADED`, `DOCUMENT_EXTRACTION_STARTED`, `DOCUMENT_EXTRACTION_COMPLETED`, `DOCUMENT_EXTRACTION_FAILED`, `AI_SUMMARY_STARTED`, `AI_SUMMARY_COMPLETED`, `AI_SUMMARY_FAILED`, `PDF_DOWNLOADED`

**Admin events:** `ADMIN_LOGIN`, `ADMIN_VIEWED_DASHBOARD`, `ADMIN_VIEWED_USER`, `ADMIN_CHANGED_USER_ROLE`, `ADMIN_UPDATED_USER_STATUS`, `ADMIN_DELETED_DOCUMENT`, `ADMIN_DOWNLOADED_REPORT`, `ADMIN_VIEWED_REPORT`, `ADMIN_CLEANUP_FILES`

No sensitive data (passwords, tokens, full medical text, raw AI output, storage paths) is logged.

### Admin Audit Log Viewer

View audit logs at `/admin/audit-logs` with filters for actor email, action type, and entity type. Supports pagination.

### Account Management

- **Password change:** `POST /api/auth/change-password`
- **Profile update:** `PATCH /api/auth/profile`
- **Deactivate/reactivate users:** `PATCH /api/admin/users/[id]/status` — admins cannot deactivate themselves

### Upload Storage Cleanup

Admins can scan for orphaned upload folders (files no longer referenced by any document) at `/admin/settings`:

- **Dry run** — scan only, no deletions
- **Cleanup** — delete orphaned folders and log the action

API: `POST /api/admin/maintenance/cleanup-files` with `{ "dryRun": true }` or `{ "dryRun": false }`

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | JWT signing secret (min 32 chars recommended) |
| `NEXT_PUBLIC_APP_URL` | Recommended | App URL for links |
| `OPENAI_API_KEY` | Conditional | Required when `MOCK_AI_MODE=false` |
| `MOCK_AI_MODE` | No | Set to `true` for mock AI (default) |
| `MAX_UPLOAD_MB` | No | Max upload size in MB (default: 10) |
| `LOCAL_UPLOAD_DIR` | No | Upload directory (default: `storage/uploads`) |
| `ADMIN_NAME` | No | Default admin name |
| `ADMIN_EMAIL` | No | Default admin email |
| `ADMIN_PASSWORD` | No | Default admin password (change for production) |

### Production Checklist

- [ ] Use HTTPS
- [ ] Use a strong `JWT_SECRET` (32+ characters, random)
- [ ] Change the default admin password
- [ ] Set `MOCK_AI_MODE=false` only with a valid `OPENAI_API_KEY`
- [ ] Use encrypted object storage instead of local filesystem
- [ ] Use Redis-backed rate limiting (e.g. Upstash)
- [ ] Add PostgreSQL backups
- [ ] Add monitoring and logging (e.g. Datadog, Sentry)
- [ ] Add terms of service and privacy policy
- [ ] Review medical compliance requirements before real patient use

### Medical Privacy Notice

> This app is **not** HIPAA/DPDP/GDPR compliant by default. Production deployment requires legal/compliance review, encrypted storage, audit retention policies, access controls, BAA/compliant vendors where applicable, and data deletion/export workflows.

## Family Health Management

Lightweight personal/family health organizer for medical reports and AI summaries (not a hospital EMR).

### Family members & profiles

- CRUD at `/family` with mobile-first hub, stats, and member cards
- Fields: name, relation, DOB, gender, blood group, height, weight, phone, email, notes
- Relations include self, parents, spouse, children, siblings, grandparents, uncle, aunt, cousin, friend, other

### Health data per member

- **Conditions**, **allergies**, **medications**, **vitals** (with optional Recharts mini charts), **appointments**, **emergency contacts**
- **Timeline** — documents, AI reports, vitals, appointments, meds, conditions, allergies (chronological)
- **Reports tab** — linked documents with view text, generate summary, view report, PDF when available

### Linking reports

- Upload page: “Who is this report for?” (Myself or family dropdown; `?familyMemberId=` preselect)
- Dashboard/admin: **Report for: Relation - Name** or **Myself**
- `/reports/[id]` visual layout unchanged; optional “Report for” metadata only

### APIs & security

- JWT user-scoped nested routes under `/api/family-members/[id]/…` with Zod validation and audit logging
- `GET /api/admin/family-members` (optional list with owner info)

### Privacy

> Family member health data is sensitive. Only add members with consent. This app is educational, not medical diagnosis. Production requires privacy policy, secure/encrypted storage, access controls, audit retention, and data deletion/export workflows.

## Reminders & Health Activity

In-app reminder system for family health tasks (MVP — no SMS/email/push delivery yet).

### Reminder types

- **Medication** — optional reminder when adding a medication (daily repeat by default)
- **Appointment** — optional “Remind me” when scheduling (default: 1 day before)
- **Vital** and **custom** — create from `/reminders/new`

### User features

- `/reminders` hub with Today / Upcoming / Done / Skipped / All filters
- Mark **Done**, **Skip**, edit, or delete; repeating reminders spawn the next occurrence when completed
- `GET /api/health-today` powers **Today’s Health Tasks** on the dashboard (pending reminders, visits, reports awaiting AI summary)
- Family member profile includes a **Reminders** tab
- Mobile bottom nav: Home | Family | **Upload** (center) | Reminders (badge) | Settings

### Browser notifications (preparation)

- Settings → Notification preferences: request permission, status display
- Future push will use **generic** copy only (no medical details on lock screens)
- `lib/notification-permission.ts` helpers for supported browsers

### Admin

- Dashboard stats: total / pending / completed reminders
- Read-only `/admin/reminders` table
- `GET /api/admin/reminders/stats`

### Privacy

> Reminder titles in future push notifications should stay generic on lock screens. Full details remain inside the authenticated app.

## Smart Search, Insights, and Trends

Search and analyze your stored health data in-app (PostgreSQL/Prisma — no external search engine).

### Search (`/search`)

- Search documents, AI report summaries, family members, conditions, allergies, medications, appointments, reminders, and vitals
- Filters: type, family member, optional date range
- Dashboard search bar and hamburger **Search** link

### Health Insights (`/insights`)

- Rule-based insights (no OpenAI in this phase): pending summaries, appointments, vitals gaps, skipped reminders, etc.
- Generate, mark read, delete; stored in `HealthInsight` table
- Dashboard **Smart Insights** shows top unread items

### Vital trends

- `GET /api/family-members/[id]/vitals/trends` with summary (latest, average, min, max)
- Family profile **Vitals** tab: type filter, Recharts trend, summary cards

### Report comparison

- `/family/[id]/compare-reports` — timeline, recurring findings, abnormal value history
- Requires 2+ AI-completed reports for that member

### Admin

- `/admin/search` — users, documents, reports, family, reminders (read-only)
- Dashboard stats: family members, insights, reports this month

### Privacy & safety

- Informational only — **not medical diagnosis**
- Search audit logs query length, not full query text

## Care Sharing, Safety Tools, and Accessibility

### Doctor share links

- From a report: **Share with Doctor** — expiring read-only public link (`/share/report/[token]`)
- No raw OCR text, storage paths, or account data on public pages
- Revoke anytime

### Questions for doctor

- `/reports/[id]/doctor-questions` — rule-based or OpenAI-generated discussion questions (not advice)

### Advanced medication tracking

- Extended medication fields (instructions, refill date, reminders)
- Dose logs: taken / missed / skipped on family **Meds** tab

### Health risk dashboard

- `/health-risks` — cautious, rule-based cards from reports, vitals, reminders

### Lab test library

```bash
npm run lab-tests:seed
```

- `/lab-tests` — searchable reference ranges with disclaimers (vary by lab/age/sex)

### Symptom journal

- `/symptoms` — CRUD symptom notes with severity and family member

### Caregiver / family sharing

- `/sharing` — invite by email (MVP: copy invite link, no email sent)
- `/invite/[token]` — accept with matching login email
- `/caregiver` — read-only shared dashboard

### Emergency health card

- Family **Emergency** tab — PDF download and optional public `/emergency-card/[token]`
- User controls what is included; emergency-safe fields only

### Senior mode

- **Settings → Accessibility**: senior mode, font scale, high contrast, reduce motion
- Applied via `html` classes (`senior-mode`, `font-large`, etc.)

### Navigation

- Bottom nav: **Home | Family | Upload | Reminders | More** (`/more` grid for Search, Insights, Risks, Lab Tests, Symptoms, Sharing, Settings)
- Hamburger includes all major tools

### Admin

- `/admin/lab-tests` — manage references
- `/admin/sharing` — invites, access, masked share tokens

### Privacy & security

- Share links expire and can be revoked
- Caregiver access is permission-based (MVP read-only)
- Emergency public card is opt-in
- Do not share sensitive data without consent; production needs legal/compliance review
- Service worker does not cache `/api/share`, `/api/emergency-card`, `/api/caregiver`, `/api/symptom-journal`, `/api/health-risks` (all `/api/*` skipped)
- Service worker does not cache `/api/search`, `/api/insights`, or sensitive family APIs

### Mobile Navigation

- Hamburger slide-out menu with user info, navigation, and logout
- Desktop profile dropdown with avatar, settings, family members
- Bottom navigation: Home, Upload, Family, Settings

## Progressive Web App (Phase 7)

The app is an installable PWA with mobile-first design.

### PWA Features

- **Installable** — Add to home screen on mobile and desktop browsers
- **Manifest** — `public/manifest.webmanifest` with app name, theme color (#0f766e), icons
- **Service Worker** — `public/sw.js` caches static shell assets; network-first for pages
- **Mobile-first UI** — All user-facing pages designed for phone screens first, responsive to desktop
- **Mobile bottom navigation** — Dashboard, Upload, Docs, Settings tabs for logged-in users
- **Responsive header** — Compact mobile header with hamburger menu, full nav on desktop

### Privacy-Safe Caching

The service worker does **NOT** cache:
- `/api/*` — API responses
- `/reports/*` — Medical report pages
- `/documents/*` — Document pages
- `/storage/*` — Uploaded files
- `/admin/*` — Admin pages

Reports and documents are fetched securely after login. No medical data is stored in the browser cache.

### Icons

SVG placeholder icons with teal medical theme and "CM" initials, stored in `public/icons/`.

### Port

The app runs on port **7111**: [http://localhost:7111](http://localhost:7111)

## Troubleshooting

### If every report shows the same values

**Cause:** The mock AI generator returned a fixed hardcoded report for every document, `extractedText` was not passed into summary generation, or an old Prisma client build is stale.

**Fix:**

1. Ensure `MOCK_AI_MODE=true` uses the document-aware mock (`mock-document-aware` model) that parses lab values from each file’s `extractedText`.
2. On the document detail page (development only), confirm **extracted text length** and preview differ per upload.
3. Use **Regenerate Summary** on the report or document page to replace old duplicate summaries.
4. Run `npx prisma generate` after schema changes, then `npm run build`.

Regeneration counts toward monthly AI usage when OpenAI is enabled; in mock/dev mode it does not consume quota.

### psql not recognized

Add PostgreSQL bin to your PATH:

```powershell
$env:Path += ";C:\Program Files\PostgreSQL\16\bin"
```

Or add it permanently via System Environment Variables.

Verify:

```bash
psql --version
```

### Database connection failed

- Make sure PostgreSQL is running
- Check `DATABASE_URL` in `.env` has the correct password
- Ensure the `carely_med_gen_ai` database exists

### Prisma migrate failed

- Ensure the database exists: `CREATE DATABASE carely_med_gen_ai;`
- Check PostgreSQL is accessible on port 5432
- Run `npx prisma migrate reset` to reset (destroys data)

### Port 7111 already in use

Stop the existing process:

```powershell
.\stop-carely.bat
```

Or manually:

```powershell
Get-NetTCPConnection -LocalPort 7111 | Select-Object OwningProcess
Stop-Process -Id <PID> -Force
```

### Admin login not working

1. Ensure admin was created: `npm run admin:create`
2. Check `.env` has correct `ADMIN_EMAIL` and `ADMIN_PASSWORD`
3. Try resetting: delete the admin user from the database and re-run `npm run admin:create`

## Safe AI Chatbot (Vaidya GPT)

Three educational chatbots use **OpenAI only** (no mock replies). They do not diagnose, prescribe, or replace a doctor.

| Chat | Page | API | Purpose |
|------|------|-----|---------|
| **Report Chat** | `/reports/[id]/chat` | `GET/POST /api/reports/[id]/chat` | Questions about **one** report (summary, findings, lab values) |
| **Family Health Chat** | `/health-chat` | `GET/POST /api/health-chat` | Family reports, trends, reminders, risks (saved data only) |
| **Support Chat** | `/help/chat` | `GET/POST /api/support/chat` | App usage: upload, Razorpay billing, profile, family, tickets |

- **Floating button:** “Ask Vaidya GPT” (desktop bottom-right; respects mobile bottom nav).
- **Emergency triggers:** chest pain, severe breathlessness, stroke symptoms, etc. → urgent care message (no normal AI analysis).
- **Rate limit:** 20 messages per 10 minutes per user.
- **Monthly limits:** Free 20 · Pro 500 · Family 2000 chat messages (`chatMessagesUsed` on `UsageCounter`).
- **Admin:** Dashboard shows chat thread count, message count, failed chat calls (metadata only — no private message bodies).

```env
OPENAI_CHAT_MODEL=gpt-4o-mini   # optional; falls back to OPENAI_MODEL
```

Disclaimer shown in chat UI: educational only, not diagnosis or emergency advice.

## User profile / hospital details

Users can manage a hospital-style profile at `/settings/profile`:

- **Billing (required for Razorpay):** full name, email, phone number
- **Medical (recommended):** gender, date of birth, blood group, height, weight
- **Address & emergency contact:** used in doctor visit pack and emergency flows
- **Health summaries:** optional known conditions, allergies, medicines

Razorpay Checkout receives **only** name, email, and phone (`contact`). Medical fields are never sent to Razorpay.

API: `GET/PATCH /api/profile`, `PATCH /api/profile/billing`

## Plans, usage limits, and Razorpay billing

Vaidya GPT uses **Razorpay** for paid plan upgrades. Mock billing has been removed from normal user flows.

Three plans are enforced **server-side** via `lib/plans.ts` and `lib/billing/plan-billing.ts`:

| Plan | Price | Uploads/mo | AI summaries/mo | Max image pages/report | Caregiver sharing |
|------|-------|------------|-----------------|------------------------|-------------------|
| Free | ₹0 | 3 | 1 | 3 | No |
| Pro | ₹9 | 50 | 50 | 20 | No |
| Family | ₹249 | 500 | 500 | 20 | Yes |

- **Free** — default plan, no payment required.
- **Pro / Family** — purchased through Razorpay Checkout; plan activates only after server-side signature verification.
- **Usage API:** `GET /api/billing/usage`
- **Razorpay APIs:** `POST /api/billing/razorpay/create-order`, `POST /api/billing/razorpay/verify`, `POST /api/billing/razorpay/webhook`, `GET /api/billing/payments`
- **Mock upgrade removed:** `POST /api/billing/mock-upgrade` returns `410` with `MOCK_BILLING_REMOVED`.

### Razorpay setup (test mode)

1. Add Razorpay test keys to `.env`:

```env
RAZORPAY_ENABLED=true
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_WEBHOOK_SECRET=xxx
RAZORPAY_CURRENCY=INR
```

2. Restart the dev server.
3. Open `/billing` and click **Upgrade with Razorpay**.
4. Complete a Razorpay test payment.
5. After verification, the plan activates and payment history updates.

### Live payments

Replace test keys with live keys in `.env` (no code changes required):

```env
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=live_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxx
```

### Webhook (local)

```bash
ngrok http 7111
```

Webhook URL: `https://YOUR-NGROK/api/billing/razorpay/webhook`

### Database migration

```bash
npx prisma migrate dev --name razorpay_only_billing
npx prisma generate
```

### Billing usage: `prisma.usageCounter` undefined

If `GET /api/billing/usage` logs `Cannot read properties of undefined (reading 'upsert')`, the running dev server has a stale Prisma client (common after adding the `UsageCounter` model while the server is running).

1. Stop the dev server once
2. Run `npx prisma generate`
3. Run `npm run dev`

Until you restart, the API returns safe zeroed usage with a warning instead of a 500.

## Legal pages and signup consent

Public pages (operated by **UrbanMove Services Private Limited**):

| Path | Purpose |
|------|---------|
| `/privacy` | Privacy Policy |
| `/terms` | Terms of Use |
| `/disclaimer` | Medical Disclaimer |
| `/consent` | Consent & Data Use |
| `/contact` | Contact (form placeholder; email not wired) |
| `/about` | About the product |
| `/help` | Help center / FAQ |

Signup requires a legal consent checkbox (Terms, Privacy, Consent, Disclaimer acknowledgment). Accepted timestamps are stored on the user record when the `legal_consent_pages` migration is applied.

```bash
npx prisma migrate dev --name legal_consent_pages
npx prisma generate
```

Footer component: `components/PublicFooter.tsx` (landing, pricing, legal pages).

## Onboarding

New users (`onboardingCompleted=false`) are guided through `/onboarding` after signup:

1. Welcome → 2. Profile → 3. Family → 4. Upload (optional) → 5. Complete

APIs: `GET /api/onboarding/status`, `PATCH /api/onboarding/profile`, `POST /api/onboarding/complete`

Settings includes **Restart onboarding** for testing.

**Skip onboarding:** any onboarding step has **Skip for now** — calls `POST /api/onboarding/complete` with `{ "skipped": true }` and updates auth state before redirecting to `/dashboard`.

Mark all existing users as onboarded (local testing only):

```bash
npm run onboarding:complete-all
```

## Demo mode

Pre-filled demo account for sales and UI testing (fake data only):

```bash
npm run demo:seed
```

| Field | Value |
|-------|--------|
| Email | `demo@carelymed.ai` |
| Password | `Demo@12345` |
| Plan | Family |

- Landing page and pricing: **Try Demo** → `POST /api/demo/login` (enabled when `NODE_ENV !== production` or `MOCK_AI_MODE=true`)
- Dashboard shows a **Demo account** badge

## Forgot password and email verification

**Forgot password** (no email provider required in dev):

- `/forgot-password` → `POST /api/auth/forgot-password`
- Dev response may include `resetUrl` for testing
- `/reset-password/[token]` → `POST /api/auth/reset-password`

**Email verification** (mock links in dev):

- Signup creates a verification token; dev may return `verificationUrl`
- Settings: **Send verification link** → `POST /api/auth/send-verification`
- `/verify-email/[token]` → `POST /api/auth/verify-email`

Forgot-password responses never reveal whether an email exists.

## Admin billing stats

`GET /api/admin/billing/stats` — users by plan, monthly uploads/AI usage, users near limits.

Admin users table shows plan, verified status, and usage counts.

## Testing with ngrok

Use ngrok to open the local app on a phone or share HTTPS links for demos. The app uses **relative API paths** (`/api/...`), so the browser automatically talks to the same ngrok origin—no hardcoded `localhost` in the frontend.

### Steps

1. Start the app (if not already running):

   ```bash
   npm run dev
   ```

2. In another terminal, start ngrok:

   ```bash
   ngrok http 7111
   ```

3. Open the **HTTPS forwarding URL** (for example `https://your-subdomain.ngrok-free.dev`) in the browser or on your phone.

4. Sign up, log in, upload, and use the dashboard—the API should work on that same URL.

### Share / invite / emergency links

Doctor share links, caregiver invites, and emergency card URLs are built from the incoming request (`Origin`, `X-Forwarded-Host`, etc.), so links created while you are on ngrok use the ngrok domain automatically. Localhost still works when you develop locally.

Optional env fallbacks (only if headers are missing):

- `NEXT_PUBLIC_PUBLIC_APP_URL` — preferred public URL
- `NEXT_PUBLIC_APP_URL` — secondary fallback

### PWA manifest was cached as HTML

If DevTools shows `manifest.webmanifest: Syntax error` (often ngrok’s HTML warning page cached as JSON):

1. Open DevTools → **Application** → **Service Workers** → **Unregister**
2. **Clear site data** for the ngrok origin
3. Visit the ngrok URL once in the browser (click through the ngrok warning if shown)
4. Reload and open `/manifest.webmanifest` — it should show valid JSON

Regenerate PNG icons if needed: `npm run pwa:icons`

### HMR WebSocket warning

`WebSocket connection to /_next/webpack-hmr failed` through ngrok is a **development-only** HMR issue. It is not fatal—the app still works after a full page refresh. `allowedDevOrigins` in `next.config.js` includes common ngrok domains when possible.

### Google Fonts / CSP console noise

The app uses **system fonts only** (no `fonts.googleapis.com` imports). CSP warnings about Google Fonts usually come from **browser extensions** (for example wallet extensions)—they can be ignored.

### Security reminder

An ngrok URL is **public on the internet**. Do not test with real sensitive medical data. Use demo accounts and sample reports only.

> **Note:** Changes to `next.config.js` (CSP, `allowedDevOrigins`, manifest headers) apply after the Next.js dev process reloads that config—restart dev only when you need those header updates to take effect.

## Post-Report Automation Pipeline

After a report upload, text extraction, optional health context questionnaire, and successful **AI summary** generation, Vaidya GPT runs an automatic post-processing pipeline (no manual steps):

1. **Upload report** → OCR/text extraction  
2. **Health context** (optional questionnaire)  
3. **Generate AI summary** from real `extractedText` + context (OpenAI; mock summaries disabled in user flow)  
4. **Post-processing** (`lib/report-post-processing.ts`):
   - Health risk cards → `HealthRisk` table + `/health-risks` dashboard  
   - Smart insights → `HealthInsight`  
   - Family timeline events → `FamilyTimelineEvent`  
   - Lab trend records → `LabTrendRecord` (compare reports, family lab trends tab)  
   - Reminder **suggestions** → `ReminderSuggestion` (accept to create real reminders)  
   - In-app notifications → `AppNotification`  
   - Family member profile fields (`lastReportAt`, `lastAiSummaryAt`, `lastRiskLevel`, `healthScoreLatest`)  
   - Admin analytics counters  

The generate-summary API response includes `postProcessing` counts. The dashboard refreshes via `carely-dashboard-refresh` without a full page reload.

### Backfill old reports

For reports that already have `ai_completed` status but no stored risks:

```bash
npm run reports:backfill
```

### Troubleshooting — empty Health Risk Dashboard

- Document must reach **`ai_completed`** (AI summary saved).  
- New reports populate risks automatically after summary generation.  
- Old reports: run `npm run reports:backfill`.  
- Verify API: `GET /api/health-risks` (auth required).  
- Risks need report data: `abnormalValues`, `riskFlags`, and/or `chartData` from the AI summary.  
- Risk wording is informational only (“may need attention”, “consider discussing with your doctor”) — not a diagnosis.

### Troubleshooting — Prisma delegate / schema errors

If logs or API responses show:

- `prisma.healthRisk.findMany is undefined`
- `prisma.reminderSuggestion` / `prisma.appNotification` / `prisma.labTrendRecord` / `prisma.familyTimelineEvent` undefined
- `Unknown argument lastReportAt` on `familyMember.update`

The schema in `prisma/schema.prisma` already defines `HealthRisk`, `FamilyTimelineEvent`, `LabTrendRecord`, `ReminderSuggestion`, `AppNotification`, and `FamilyMember` fields (`lastReportAt`, `lastAiSummaryAt`, `lastRiskLevel`, `healthScoreLatest`). The running dev server often has a **stale Prisma client** until you regenerate.

**Fix (Windows — stop dev server first):**

1. Stop the process on port 7111 (Ctrl+C in the terminal running `npm run dev`).
2. Run:

```bash
npx prisma generate
npx prisma migrate dev --name health_risk_post_processing_schema
```

If migration `20260528120000_health_risk_post_report_pipeline` was already applied, `migrate dev` may report the database is up to date — that is fine.

3. Start the app:

```bash
npm run dev
```

4. Optional backfill for older AI-completed reports:

```bash
npm run reports:backfill
```

Until generate + restart, dashboard APIs return **empty safe fallbacks** (HTTP 200) instead of 500 errors.

## QA, testing, and stabilization

### Admin tools

| Page | Purpose |
|------|---------|
| `/admin/qa-checklist` | Grouped manual QA items (pass/fail/notes) |
| `/admin/system-health` | Live DB, OpenAI, OCR, jobs, documents, risks, errors |
| `/admin/error-logs` | Sanitized server errors (no medical text) |

Seed or sync checklist items: **Sync checklist** on the QA page, or `POST /api/admin/qa-checklist/seed` (admin auth).

### Commands

```bash
npx prisma generate
npx prisma migrate dev
npm run build
npm run test:smoke
npm run prod:check
npm run dev
```

- **`test:smoke`** — database, Prisma delegates, env, manifest, brand assets, optional HTTP checks against `http://localhost:7111` (start dev server first for HTTP checks).
- **`test:e2e`** — API-level end-to-end flow tests (auth, family, billing limits, upload/OCR, AI summary, isolation, admin, PWA). Requires `npm run dev` on port 7111.
- **`test:qa:auto`** — Auto-verify QA checklist items via API/HTML checks and update `/admin/qa-checklist` (pending items only by default).
- **`test:all`** — Runs smoke, prod check, build, E2E, and QA auto-verification; writes `test-results/full-qa-report.json`.
- **`test:qa:manual-guide`** — Prints pending manual steps and refreshes `docs/QA-MANUAL-RUNBOOK.md`.
- **`prod:check`** — production readiness: blockers vs warnings (JWT, OpenAI, admin user, encryption, manifest brand, etc.).

### Full QA suite (`test:all`)

**Terminal 1:** `npm run dev`

**Terminal 2:** `npm run test:all`

Runs `test:smoke`, `prod:check`, `build`, `test:e2e` (unless skipped), and `test:qa:auto`. Auto-marks checklist items in the database where scripts can verify them; visual/mobile items stay **pending** with notes.

| Variable | Purpose |
|----------|---------|
| `TEST_ALL_SKIP_E2E` | Skip E2E subprocess |
| `TEST_ALL_SKIP_BUILD` | Skip `npm run build` |
| `TEST_QA_SKIP_LIVE` | Skip live API checks in QA auto-verifier |
| `QA_AUTO_OVERWRITE` | `true` to update pass/fail items already set |

Review results: `http://localhost:7111/admin/qa-checklist` and `test-results/full-qa-report.json`.

### End-to-end tests (`test:e2e`)

To run full multi-image upload tests, place fixtures here:

- `test-fixtures/lab-page-1.jpeg`
- `test-fixtures/lab-page-2.jpeg`
- `test-fixtures/lab-page-3.jpeg`
- `test-fixtures/lab-page-4.jpeg`

(`.jpg`, `.png`, or `.webp` also work. Files at the project root are copied into `test-fixtures/` on first run.)

**Terminal 1:**

```bash
npm run dev
```

**Terminal 2:**

```bash
npm run test:e2e
```

Results: PASS/FAIL table in the terminal and `test-results/e2e-report.json`.

Upload coverage includes: single JPEG upload (OpenAI Vision OCR), Free plan 3-image multi-upload, Free plan 4-image block (`IMAGE_PAGE_LIMIT_REACHED`), and Pro plan 4-image upload after test `force-plan` helper (`E2E_ALLOW_TEST_HELPERS=true`).

**Optional environment variables:**

| Variable | Default | Purpose |
|----------|---------|---------|
| `E2E_BASE_URL` | `http://localhost:7111` | App base URL |
| `E2E_SKIP_OPENAI` | `false` | Skip paid OpenAI summary/translation calls |
| `E2E_SKIP_UPLOAD` | `false` | Skip upload/OCR tests |
| `E2E_KEEP_TEST_DATA` | `false` | Keep `@vaidya.test` users and data after run |
| `E2E_ALLOW_TEST_HELPERS` | `false` | Enable `POST /api/test/force-plan` for E2E (non-production only) |
| `E2E_ADMIN_EMAIL` | — | Admin login for `/api/admin/*` checks |
| `E2E_ADMIN_PASSWORD` | — | Admin password |

**Skipped when:**

- Dev server not running → exit 1 with message to start `npm run dev`
- Missing lab-page fixtures → upload/OCR section SKIP
- `E2E_SKIP_OPENAI=true` or missing `OPENAI_API_KEY` → AI summary/translation SKIP; OCR failures SKIP (not FAIL) when key absent
- Admin env not set → authenticated admin API checks SKIP
- No reminder/notification/risk data → WARN only, not FAIL

### Manual test focus areas

1. **Branding** — Vaidya GPT + logo on `/`, `/dashboard`, auth, PDF.
2. **Multi-image upload** — Free max 3 pages; Pro/Family max 20; one multi-image report = 1 monthly upload.
3. **OCR** — OpenAI Vision primary; `ENABLE_TESSERACT_OCR=false` (default); server must not crash on missing Tesseract data.
4. **AI summary** — Real `extractedText` only; `MOCK_AI_MODE` not used in user flow; missing key → clean error.
5. **Health risks** — Cards after summary; `npm run reports:backfill` for old reports.
6. **Translation** — Hindi/regional UI; report translate with consent; Urdu RTL layout.
7. **Data isolation** — User A cannot open User B documents/reports/family via API.
8. **PWA** — Valid manifest, icons, favicon; hard refresh after icon changes.

See `docs/QA-MANUAL-CHECKLIST.md` for a printable checklist summary.

### Environment notes

```env
ENABLE_TESSERACT_OCR=false
OPENAI_IMAGE_OCR_PROVIDER=openai
NEXT_PUBLIC_APP_NAME="Vaidya GPT"
```

## License

Private — All rights reserved.
