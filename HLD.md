# High-Level Design — ATS Resume & CV Builder (Web)

| Field | Value |
|---|---|
| Document | HLD v1.0 |
| Date | 26 July 2026 |
| Owner | Mohammed Abdul |
| Status | Ready for Claude Code |
| Companion docs | PRODUCT_SPEC_FINAL.md, CLAUDE_FINAL.md, MODEL_ROUTING_SPEC.md, faq-format-reference.html |

This document is the architectural blueprint. It defines system structure, component boundaries, data flow, and technical contracts. It does not repeat product requirements (see PRODUCT_SPEC_FINAL) or coding rules (see CLAUDE_FINAL). Read all four companion docs before building.

---

## 1. Architectural Principles

1. **Two isolated cost domains.** The free tier and premium tier are architecturally separated. Free-tier code paths physically cannot reach the Anthropic client. This is enforced by module boundaries, not discipline.
2. **One schema, many renderers.** `ResumeData` is the single source of truth. Templates, editor, PDF, and DOCX all consume it. No renderer parses HTML back into data.
3. **Server owns all spend.** Every model call happens server-side. The client never holds a key and never calls Anthropic directly.
4. **Meter before spend.** Credits are decremented in a transaction before any paid model call. Failures refund atomically.
5. **Stateless request handlers, stateful database.** The Node process holds no session state between requests. All state lives in Postgres. This survives Hostinger's single-process, ephemeral-filesystem model.
6. **Graceful degradation.** If Anthropic is unreachable, the premium tier degrades to manual editing. The free tier is unaffected because it never depended on the model.

---

## 2. System Context

```
┌─────────────────────────────────────────────────────────────┐
│                         BROWSER (client)                     │
│  Next.js React app · Tailwind · shadcn/ui                    │
│  - Free tier UI (parse, edit, template, export)             │
│  - Premium tier UI (JD input, gap review, draft editor)     │
│  - NEVER holds an Anthropic key                             │
└───────────────┬─────────────────────────────────────────────┘
                │ HTTPS
                ▼
┌─────────────────────────────────────────────────────────────┐
│              NEXT.JS SERVER (Hostinger Node 20)              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Route Handlers / Server Actions                    │    │
│  │  /api/parse    (free  · regex, no model)           │    │
│  │  /api/analyze  (prem  · Haiku RT)                  │    │
│  │  /api/rewrite  (prem  · Sonnet RT)                 │    │
│  │  /api/faq      (prem  · Batch, async)             │    │
│  │  /api/export   (both  · PDF/DOCX)                 │    │
│  │  /api/billing  (webhooks · Razorpay/Stripe)       │    │
│  │  /api/health                                       │    │
│  └────────────────────────────────────────────────────┘    │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐    │
│  │ Auth.js      │  │ Entitlements │  │ Credit Ledger  │    │
│  │ (Google)     │  │ (tier gate)  │  │ (transactions) │    │
│  └──────────────┘  └──────────────┘  └────────────────┘    │
└──────┬─────────────────┬──────────────────┬────────────────┘
       │                 │                  │
       ▼                 ▼                  ▼
┌────────────┐   ┌───────────────┐   ┌─────────────────────┐
│ Postgres   │   │ Anthropic API │   │ Payment Providers   │
│ (Neon/     │   │ (premium only)│   │ Razorpay (India)    │
│  Supabase) │   │ RT + Batch    │   │ Stripe (intl)       │
└────────────┘   └───────────────┘   └─────────────────────┘
```

External dependencies: Google OAuth (auth), Anthropic API (premium AI), Razorpay/Stripe (payments), Postgres host (data). No other third-party runtime dependencies.

---

## 3. Layered Architecture

```
┌─────────────────────────────────────────────────────────┐
│ PRESENTATION   React components, template renderers       │
│                (src/app, src/components, src/templates)   │
├─────────────────────────────────────────────────────────┤
│ APPLICATION    Route handlers, server actions, orchestr.  │
│                (src/app/api)                              │
├─────────────────────────────────────────────────────────┤
│ DOMAIN         ResumeData schema, ATS rules, scoring,     │
│                entitlements, credit ledger logic          │
│                (src/lib/schema, ats, billing)             │
├─────────────────────────────────────────────────────────┤
│ INFRASTRUCTURE Parsers, AI client, exporters, DB access   │
│                (src/lib/parsers, ai, export, db)          │
└─────────────────────────────────────────────────────────┘
```

Dependency rule: higher layers depend on lower, never the reverse. The domain layer has no knowledge of React, Anthropic, or Postgres — it is pure TypeScript operating on `ResumeData`.

**Cost-domain firewall:** the free-tier application layer imports from `src/lib/parsers` and `src/lib/export` only. It has no import path to `src/lib/ai`. A build-time lint rule enforces this — any import of `src/lib/ai` from a free-tier module fails the build.

---

## 4. Component Breakdown

### 4.1 Presentation Layer

| Component | Responsibility | Tier |
|---|---|---|
| `(free)/upload` | File drop, parse trigger, review form | Free |
| `(free)/template` | Gallery, live preview, ATS score display | Free |
| `(free)/export` | Format selection, download | Free |
| `(premium)/tailor` | JD input, gap report, skill-gap flow | Premium |
| `(premium)/editor` | Split-view draft editor, accept/revert/regenerate | Premium |
| `(premium)/faq` | FAQ pack status, in-app accordion viewer | Premium |
| `account/` | Credits, saved resumes, deletion | Both |
| `templates/*` | 8 self-contained renderers (React + PDF + DOCX variants) | Both |

### 4.2 Application Layer (Route Handlers)

| Route | Method | Tier | Model | Mode | Sync/Async |
|---|---|---|---|---|---|
| `/api/parse` | POST | Free | none | — | Sync |
| `/api/analyze` | POST | Premium | Haiku | RT | Sync |
| `/api/rewrite` | POST | Premium | Sonnet | RT | Sync |
| `/api/summary` | POST | Premium | Sonnet | RT | Sync |
| `/api/faq/enqueue` | POST | Premium | — | — | Sync (returns job id) |
| `/api/faq/status` | GET | Premium | — | — | Sync (poll) |
| `/api/faq/webhook` | POST | Premium | Haiku+Sonnet | Batch | Async callback |
| `/api/export` | POST | Both | none | — | Sync (queued) |
| `/api/billing/checkout` | POST | Premium | — | — | Sync |
| `/api/billing/webhook` | POST | Premium | — | — | Async callback |
| `/api/health` | GET | — | — | — | Sync |

### 4.3 Domain Layer

| Module | Responsibility |
|---|---|
| `schema/resume.ts` | `ResumeData` type + zod validator, provenance tracking |
| `ats/rules.ts` | A1–A8 constraint definitions |
| `ats/score.ts` | Client-safe ATS scoring (no I/O, pure function) |
| `ats/assert.ts` | Post-export re-extraction assertion |
| `billing/entitlements.ts` | Tier gate: can this account do this action? |
| `billing/ledger.ts` | Credit debit/refund, transaction-safe |

### 4.4 Infrastructure Layer

| Module | Responsibility |
|---|---|
| `parsers/pdf.ts` | pdf-parse text extraction (free) |
| `parsers/docx.ts` | mammoth text extraction (free) |
| `parsers/heuristic.ts` | Regex section detection (free) |
| `ai/client.ts` | Single Anthropic client, retry/backoff (premium) |
| `ai/routing.ts` | Task → model + mode map |
| `ai/batch.ts` | Batch job submission + polling |
| `ai/usage.ts` | usage_events writer |
| `export/pdf.ts` | react-pdf renderer + queue |
| `export/docx.ts` | docx generator |
| `db/schema.ts` | Drizzle table definitions |
| `db/client.ts` | Pooled Postgres connection |

---

## 5. Data Architecture

### 5.1 Canonical Type

`ResumeData` (defined in PRODUCT_SPEC_FINAL §6). Every field optional-tolerant. Provenance per bullet: `origin: 'source' | 'rewritten' | 'generated'`, with `originalText` retained for `rewritten`.

### 5.2 Database Schema

```
accounts
  id              uuid pk
  google_sub      text unique
  email           text
  display_name    text
  locale          text          -- 'in' | 'intl'
  created_at      timestamptz
  last_seen_at    timestamptz

resumes
  id                    uuid pk
  account_id            uuid fk -> accounts
  title                 text
  resume_data_encrypted bytea     -- app-layer encrypted ResumeData JSON
  is_tailored           boolean
  source_resume_id      uuid?     -- if tailored, points to base
  created_at            timestamptz
  updated_at            timestamptz

credits
  account_id             uuid pk fk -> accounts
  tailored_resume_credits int
  faq_pack_credits        int
  expires_at              timestamptz    -- 12 months from purchase
  updated_at              timestamptz

faq_jobs
  id              uuid pk
  account_id      uuid fk -> accounts
  resume_id       uuid fk -> resumes
  batch_id        text          -- Anthropic batch id
  status          text          -- 'queued' | 'processing' | 'ready' | 'failed'
  result_html     text?         -- generated FAQ guide HTML
  created_at      timestamptz
  completed_at    timestamptz?

usage_events
  id              uuid pk
  account_id      uuid fk -> accounts
  operation       text          -- 'analyze' | 'rewrite' | 'summary' | 'faq'
  model           text          -- 'haiku' | 'sonnet'
  mode            text          -- 'realtime' | 'batch'
  tokens_in       int
  tokens_out      int
  cost_usd        numeric(10,6)
  created_at      timestamptz

purchases
  id              uuid pk
  account_id      uuid fk -> accounts
  provider        text          -- 'razorpay' | 'stripe'
  provider_ref    text unique   -- idempotency key
  product         text          -- 'base' | 'topup'
  amount_minor    int           -- paise or cents
  currency        text
  created_at      timestamptz
```

### 5.3 Encryption

`resume_data_encrypted` is encrypted at the application layer (AES-256-GCM) with a key held in environment configuration, separate from the database credentials. The database never sees plaintext resume content. Decryption happens only in the request handler, in memory, for the duration of the request.

### 5.4 Connection Management

Hostinger runs one long-lived Node process. Use a pooled connection (Neon/Supabase pooler endpoint) sized to the plan's connection limit. Do not open a connection per request. Do not use serverless-style connection-per-invocation patterns.

---

## 6. Request Flows

### 6.1 Free Tier: Upload → Download (Zero Model Calls)

```
Browser: user drops resume.pdf
   │ POST /api/parse (multipart)
   ▼
Server: /api/parse
   ├─ auth check (Auth.js session)
   ├─ pdf-parse → raw text          [no model]
   ├─ heuristic.ts → section split  [no model, regex]
   ├─ build ResumeData (partial)
   ├─ encrypt + persist to resumes
   └─ return ResumeData JSON
   ▼
Browser: render review form
   │ user edits, selects template
   │ ats/score.ts runs client-side  [pure function, no I/O]
   │ POST /api/export { resumeId, template, format }
   ▼
Server: /api/export
   ├─ auth + ownership check
   ├─ decrypt ResumeData
   ├─ enqueue render job (PDF queue)
   ├─ react-pdf OR docx → buffer
   ├─ ats/assert.ts re-extract & verify (PDF)
   └─ stream file to client
   ▼
Browser: download begins
```

Cost of this entire flow: ₹0. No path touches `src/lib/ai`.

### 6.2 Premium Tier: Tailor a Resume (Real-Time)

```
Browser: user pastes JD, clicks "Tailor"
   │ POST /api/analyze { resumeId, jdText }
   ▼
Server: /api/analyze
   ├─ auth + entitlement check (canTailorResume)
   ├─ ledger.debit(tailored_resume_credits) [in txn]
   ├─ ai/client → Haiku RT (JD analysis)
   ├─ ai/client → Haiku RT (gap analysis)
   ├─ usage.write × 2
   └─ return gap report
   ▼
Browser: gap review + skill-gap flow (user decisions)
   │ POST /api/rewrite { resumeId, decisions }
   ▼
Server: /api/rewrite
   ├─ ai/client → Sonnet RT (bullet rewriting)
   ├─ ai/client → Sonnet RT (summary)
   ├─ usage.write × 2
   └─ return draft with provenance
   ▼
Browser: split-view editor
   │ per bullet: accept / revert / regenerate (max 10)
   │ POST /api/rewrite (regenerate) → Sonnet RT
   │ user confirms
   │ POST /api/export → tailored PDF + DOCX
   ▼
Server: export (same as free flow)
```

If Anthropic is unreachable at `/api/analyze`, the credit is NOT debited (debit happens in the same transaction as the call attempt; failure rolls back), and the user sees a "try again later, or edit manually" message.

### 6.3 Premium Tier: FAQ Generation (Batch, Async)

```
Browser: user clicks "Generate Interview Prep"
   │ POST /api/faq/enqueue { resumeId }
   ▼
Server: /api/faq/enqueue
   ├─ auth + entitlement (canGenerateFAQPack)
   ├─ ledger.debit(faq_pack_credits) [in txn]
   ├─ build 4 batch requests (see §7.2)
   ├─ ai/batch → submit to Anthropic Batch API
   ├─ insert faq_jobs row (status: queued, batch_id)
   └─ return { jobId }
   ▼
Browser: shows "Your prep pack is generating (up to 24h).
          We'll email you when ready."
   │ polls GET /api/faq/status?jobId  (or waits for email)
   ▼
[hours later] Anthropic completes batch
   │ POST /api/faq/webhook  (or poll picks it up)
   ▼
Server: /api/faq/webhook
   ├─ fetch batch results
   ├─ assemble into FAQ guide HTML (see §8)
   ├─ usage.write × 4
   ├─ update faq_jobs (status: ready, result_html)
   └─ notify user (email)
   ▼
Browser: GET /api/faq/status → ready
   │ render in-app accordion + offer PDF/DOCX/HTML download
```

The 24-hour batch latency is why the FAQ pack is decoupled from the synchronous tailoring flow. The user gets their tailored resume immediately and their prep pack later.

---

## 7. AI Subsystem Design

### 7.1 Client and Routing

Single `AnthropicClient` in `ai/client.ts`. All calls go through it. `ai/routing.ts` is the only place that maps a task to a model and mode:

```
TASK                → MODEL   MODE       COST/CALL
jd_analysis         → haiku   realtime   $0.006
gap_analysis        → haiku   realtime   $0.006
bullet_rewriting    → sonnet  realtime   $0.088
regenerate_bullet   → sonnet  realtime   $0.014  (max 10/resume)
summary_generation  → sonnet  realtime   $0.012
faq_basic           → haiku   batch      $0.025
faq_intermediate    → haiku   batch      $0.025
faq_advanced        → sonnet  batch      $0.047
faq_behavioural     → sonnet  batch      $0.019
```

Every call: request JSON with strict zod schema, validate on receipt, retry once on malformed output, exponential backoff on transient failure, write `usage_events` before returning.

### 7.2 Batch Pipeline (FAQ)

Four independent batch requests per pack, not one monolithic call:

1. **Basic (Haiku):** 25 fundamentals for the role/seniority.
2. **Intermediate (Haiku):** 25 applied "how would you" questions.
3. **Advanced (Sonnet):** 25 scenario questions — each a concrete situation with constraints, then an approach ask.
4. **Behavioural (Sonnet):** 8–10 STAR questions grounded in the user's actual resume content.

Each question object the model returns:

```
{
  id, difficulty, category,
  question,
  whatTheyWantToKnow,      // the hidden agenda
  answer,                  // 150-250 word model answer
  keyPoints: string[],     // 3-5 things the interviewer listens for
  redFlag,                 // one thing to avoid
  doList?: string[],       // optional
  dontList?: string[]      // optional
}
```

This object shape maps directly onto the HTML card format in §8.

### 7.3 Cost Guardrails

- `ledger.debit` runs in the same DB transaction that precedes the model call. Failure rolls back the debit.
- Hard per-account token budget in `usage_events`, independent of credits, as a runaway backstop.
- Daily aggregate spend alarm at ₹22,000; breach disables new generations and notifies the operator.
- Regeneration counter enforced server-side, capped at 10 per resume.

---

## 8. FAQ Output Format (HTML)

The FAQ pack is delivered as a **styled, standalone HTML guide** matching the attached `faq-format-reference.html`. This is a hard design contract, not a suggestion.

### 8.1 Structure

The generated HTML follows the reference exactly:

- **Header block** — dark banner, role title, subtitle, tag pills listing the question topics.
- **Sticky nav** — anchor links to each question and the final tips.
- **"How to use" alert** — a short orientation banner.
- **One card per question**, each containing:
  - Colour-coded card header (rotating through orange/blue/green/purple/red/teal/gold) with an emoji icon, a `Question NN · Category` label, and the question text.
  - A yellow **"What they really want to know"** box (the hidden agenda).
  - An optional red **"Do NOT say"** box.
  - The **answer box** with an orange label and the model answer, key phrases wrapped in a highlighted `.hi` span.
  - An optional blue/green **"Key message"** box.
  - An optional two-column **DO / DON'T** grid.
- **Final tips** section — four cards on STAR structure, role-specific numbers, practising aloud, and ending positively.
- **Footer** — attribution line.

### 8.2 Rendering Approach

A server-side template function, `faqToHtml(pack: FaqPack, meta: ResumeMeta): string`, takes the assembled question objects (§7.2) and emits the HTML. The CSS from the reference file is inlined in a `<style>` block so the download is a single self-contained file.

- The card header colour cycles deterministically by question index.
- The emoji icon is chosen per category from a fixed map.
- `.hi` highlight spans are applied to key phrases the model marks in its answer (the model is prompted to wrap 2–4 pivotal phrases per answer).

### 8.3 Delivery Formats

| Format | How |
|---|---|
| In-app | Rendered into the accordion viewer from the same question objects |
| HTML | The self-contained file from `faqToHtml`, downloadable |
| PDF | The HTML passed through react-pdf's HTML-compatible path, or a dedicated react-pdf FAQ template mirroring the card layout |
| DOCX | The docx generator produces headings per question, styled boxes as shaded paragraphs |

The reference file (`faq-format-reference.html`) is the visual acceptance target. A generated pack should be visually indistinguishable in structure from it.

---

## 9. Export Subsystem

### 9.1 Shared Pipeline

Both PDF and DOCX derive from the same `ResumeData`. The flow:

```
ResumeData → selected template → renderer → buffer → assertion → stream
```

### 9.2 PDF

- Engine: `@react-pdf/renderer`. Never Puppeteer (no Chromium on Hostinger).
- Each template has a `.pdf.tsx` variant.
- Real embedded fonts from the approved list. Real selectable text.
- Post-render: `ats/assert.ts` re-extracts text and verifies recovery of name, email, phone, every company, every job title. Failure → export fails with a clear message; if premium, refund the credit.

### 9.3 DOCX

- Engine: `docx` package.
- Each template has a `.docx.ts` variant mapping to real Word styles (Heading 1/2, body) and real bullet lists.
- Must open cleanly in Word and Google Docs.

### 9.4 Concurrency

PDF rendering is CPU-bound and blocks the event loop. Route all render jobs through an in-process queue with a small concurrency limit (e.g. 2) so one export cannot stall unrelated requests. This satisfies NFR N7.

---

## 10. Authentication and Authorization

- **Authentication:** Auth.js with Google OAuth. Session stored as an encrypted JWT cookie. No password flows.
- **Authorization gate:** every route handler that touches a resume checks (a) valid session, (b) resource ownership (account_id match), (c) for premium features, `entitlements.ts`.

---

## 11. Payments

- **Checkout:** `/api/billing/checkout` creates a provider order and returns the client token. The browser completes payment in the provider's widget.
- **Crediting:** only the provider **webhook** grants credits. Never a client-side success callback. The grant is idempotent on `provider_ref`.
- **Products:** `base` (₹499 → 3 resume + 3 FAQ credits, 12-month expiry) and `topup` (₹99 → 1 resume + 1 FAQ credit).
- **Reconciliation:** the `purchases` table is the ledger of record. A webhook that references an already-processed `provider_ref` is a no-op.

---

## 12. Deployment Architecture

```
GitHub repo
   │ push to main
   ▼
Hostinger Web Apps (auto-deploy)
   ├─ npm ci
   ├─ npm run build   (key-leak check runs here)
   ├─ npm run start -- -p $PORT
   └─ Node 20, single process
        │
        ├─→ Postgres (Neon/Supabase, pooled)
        ├─→ Anthropic API (premium paths only)
        └─→ Razorpay / Stripe (webhooks)
```

- Pin `engines.node` to 20; commit `.nvmrc`.
- `/api/health` for liveness.
- Ephemeral filesystem: no local cache, no local upload dir. Uploads processed in memory, discarded after parse.
- If `npm run build` exceeds plan memory, build in GitHub Actions and deploy the artefact.
- All secrets (Anthropic key, DB URL, encryption key, OAuth secret, payment keys) in Hostinger environment config. None in the repo.

---

## 13. Cross-Cutting Concerns

| Concern | Approach |
|---|---|
| Error handling | Every handler returns a structured error with an actionable user message. No silent catches. |
| Progress | Long operations (rewrite, export, FAQ) report real progress to the client. |
| Rate limiting | Per-account, on all API routes, keyed to google_sub. |
| Logging | Structured logs; usage_events for spend; no resume content in any log. |
| Privacy | No third-party analytics on resume-bearing pages. Product analytics carry event counts only. |
| Observability | Daily spend alarm; health endpoint; failed-export and failed-webhook counters. |
| Accessibility | WCAG AA, keyboard nav, labelled inputs, focus rings — part of "done". |

---

## 14. Technology Decisions Log

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js App Router | SSR + API routes in one deployable; fits Hostinger Node runtime |
| PDF engine | react-pdf | No Chromium dependency; works on managed Node |
| DOCX engine | docx | Real Word styles from structured data |
| Parsing (free) | pdf-parse + mammoth + regex | Pure JS, zero cost, no model |
| DB | Postgres (Neon/Supabase) | Pooled, external, survives ephemeral host |
| ORM | Drizzle | Typed, migration-friendly, lightweight |
| Auth | Auth.js + Google | No password burden; matches "Gmail sign-in" requirement |
| Real-time model | Sonnet (bullets), Haiku (classification) | Quality where visible, cost where not |
| Batch model | Mixed Haiku/Sonnet | 50% discount on non-urgent FAQ generation |
| Payments | Razorpay + Stripe | India + international coverage |

---

## 15. What Claude Code Builds First

Follow the phase plan in PRODUCT_SPEC_FINAL §17. The architectural spine to stand up in phase 1–3, in order:

1. `src/lib/schema/resume.ts` — the contract everything depends on.
2. `src/lib/db/schema.ts` + first migration — the persistence spine.
3. `src/lib/parsers/*` — free-tier ingest, no model.
4. One template end-to-end (React + PDF + DOCX) rendering a fixture.
5. `/api/parse` and `/api/export` — the entire free tier, provably zero-model.
6. The cost-domain lint rule that forbids free-tier modules from importing `src/lib/ai`.

Everything premium (analyze, rewrite, faq, billing) layers on top only after the free tier is complete and the firewall is proven.

---

## 16. Open Architectural Questions

1. **Email delivery for FAQ-ready notifications** — which provider (transactional email service) sends the "your prep pack is ready" message? Needs selection before phase 9.
2. **Batch polling vs webhook** — Anthropic Batch results can be polled or pushed. Confirm which the account tier supports and design `/api/faq/status` accordingly.
3. **Encryption key rotation** — v1 uses a single static key in env config. A rotation strategy (versioned keys) can wait until post-MVP but should be noted in the schema now (add a `key_version` column to `resumes` if adopting early).

