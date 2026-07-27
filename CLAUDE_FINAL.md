# CLAUDE.md — FINAL v3.0

Operating guide for Claude Code in this repository. **All decisions locked.**

---

## 1. What This Project Is

A **free ATS-safe resume formatter** (parse + format + template selection, zero API calls, zero cost) plus an **optional ₹499 premium tier** (AI-tailored resumes + interview prep via Claude API).

Standalone product. Not related to ResuMantra.

---

## 2. Core Invariants (Non-Negotiable)

**I1 — One schema, many renderers.**
Everything flows through `ResumeData` in `src/lib/schema/resume.ts`. Templates, editor, PDF/DOCX exporters read from it. No renderer owns content.

**I2 — Never fabricate experience.**
Model may rephrase and re-weight what the user has asserted. May not introduce employers, tools, durations, outcomes the user did not supply.

**I3 — Nothing exports without confirmation.**
No generated content reaches a download until the user has seen it in draft and explicitly confirmed.

**I4 — ATS rules are hard constraints.**
Every template satisfies A1–A8 (PRODUCT_SPEC_FINAL §12). Post-export re-extraction assertion gates every PDF. Failing assertion fails the export loudly, never delivers a broken file.

**I5 — FREE TIER HAS ZERO API CALLS.**
**This is the biggest invariant.** No Anthropic API calls in the free tier. No exceptions. Parsing happens via regex, text extraction, or lightweight client-side processing. Cost per free user must be ₹0.

If a task asks you to add an AI feature to the free tier, **refuse and flag it.** The entire free-tier value prop rests on this.

**I6 — Frontend uses ZERO API keys.**
The free tier frontend must never import or reference the Anthropic SDK. Zero. Not even a comment about it. No possibility of accidental leakage.

**I7 — Premium tier uses Claude API only.**
No cheaper models as a fallback. Haiku for classification, Sonnet for quality-critical tasks. No cost-cutting. This is locked in MODEL_ROUTING_SPEC.

**I8 — API keys are server-side only.**
Model calls happen in route handlers or server actions. Production build includes a key-leak check. Fails the build if any key appears in a client bundle.

**I9 — The app works without the model.**
Free tier is the proof. Manual editing, template selection, export all function with every AI feature disabled.

**I10 — Templates are original work.**
Layout archetypes freely reusable. Markup, CSS, assets written from scratch. No fetching from bettercv.com or copying.

**I11 — Meter before you spend.**
Credit balance checked and decremented inside a transaction before the model call. Every call writes `usage_events` row with model, tokens, cost. Daily spend alarm at ₹22,000 disables further generations.

**I12 — Free tier has no billing path.**
Free users never see a "pay" button in the core flow. Upgrade CTA is always "Upgrade to ₹499" at the step where a premium feature is referenced. No accidental charges.

---

## 3. Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript strict |
| Styling | Tailwind + shadcn/ui |
| Auth | Auth.js (NextAuth), Google OAuth |
| Database | Postgres (Neon/Supabase, external) |
| ORM | Drizzle |
| Model | Anthropic Claude (premium only) |
| PDF ingest | `pdf-parse` + regex (free tier, no ML) |
| DOCX ingest | `mammoth` (free tier) |
| TXT ingest | Direct text split + heuristic regex (free tier) |
| PDF export | `@react-pdf/renderer` (never Puppeteer) |
| DOCX export | `docx` package |
| Payments | Razorpay (India), Stripe (international) |
| Tests | Vitest + Playwright |

---

## 4. Repository Layout

```
src/
  app/
    (auth)/             sign-in, callback
    (free)/             free tier route group
    (premium)/          premium tier route group
    account/            credits, resumes, deletion
    api/
      parse/            regex-based extraction (free, zero cost)
      analyze/          JD analysis (Haiku RT, premium)
      rewrite/          bullet rewriting (Sonnet RT, premium)
      faq/              FAQ generation (batch, premium)
      export/           PDF + DOCX (both tiers)
      billing/          Razorpay/Stripe webhooks
      health/           liveness
  lib/
    schema/             ResumeData, zod validators
    db/                 drizzle schema, migrations
    auth/               Auth.js config
    billing/            credit ledger, entitlements
    parsers/
      regex/            heuristic section detection
      pdf-parse/        PDF text extraction
      docx/             DOCX text extraction
    ats/                scoring (client + server), re-extraction assertion
    locale/             India + international profiles
    ai/
      client.ts         single Anthropic client (premium only)
      routing.ts        task → model + mode (RT vs Batch)
      usage.ts          usage_events writer
      prompts/          one file per prompt, versioned
    export/
      pdf/ docx/
  templates/
    ats-plain/ ... two-column/
    registry.ts
  components/
fixtures/               sample resumes and JDs
tests/
```

---

## 5. Free Tier: Zero API

### Parsing Strategy

**No model calls. Ever.**

Text extraction via pure JavaScript libraries:

1. **PDF:** `pdf-parse` (extracts text stream, no NLP)
2. **DOCX:** `mammoth` (converts to markdown, extracts text, no NLP)
3. **TXT:** Direct text split on newlines + heuristic section detection via regex

**Heuristic section detection (no ML, no API):**

```typescript
const sectionPatterns = {
  experience: /^(Experience|Work History|Employment)/mi,
  education: /^(Education|Qualifications|Degree)/mi,
  skills: /^(Skills|Technical|Competencies)/mi,
  projects: /^(Projects|Personal Projects)/mi,
  certifications: /^(Certifications|Licenses)/mi,
};

function detectSections(text: string): { section: string; content: string }[] {
  // Split by regex, heuristically assign content to sections
  // If no match, content lands in "Unassigned" bucket
  // User drags into correct section manually
}
```

**This approach is deliberately simple:**
- Costs ₹0
- Heuristics fail on non-standard formatting (that's OK)
- User fixes manually (that's the free tier value prop)

### ATS Score (Frontend Only)

Free tier shows an **ATS confidence score** (0–100) computed client-side:

```typescript
function computeATSScore(template: Template, data: ResumeData): number {
  let score = 0;
  
  if (template.isSingleColumn) score += 25;
  if (!template.hasTableContent) score += 15;
  if (template.hasStandardHeadings) score += 20;
  if (data.hasConsistentDateFormat) score += 15;
  if (data.contactAsPlainText) score += 15;
  if (template.fontInApprovedList) score += 10;
  
  return Math.min(score, 100);
}
```

**No API call.** Pure frontend heuristics and regex.

Score updates live as user changes template. Helps user pick the most ATS-safe option.

### Free Tier Cost

| Item | Cost |
|---|---|
| Infrastructure | Shared with premium |
| API calls | **₹0** |
| Per-user storage + bandwidth | ~₹2 |
| Per signup | ₹0 |

---

## 6. Premium Tier: Model Routing (Locked)

**Reference: MODEL_ROUTING_SPEC.md §2–4**

### Real-Time API (Synchronous, User-Facing)

```typescript
const REALTIME_ROUTES = {
  jd_analysis: { model: 'haiku', cost: '$0.006' },
  gap_analysis: { model: 'haiku', cost: '$0.006' },
  bullet_rewriting: { model: 'sonnet', cost: '$0.088' },
  regenerate_bullet: { model: 'sonnet', cost: '$0.014' },
  summary_generation: { model: 'sonnet', cost: '$0.012' },
};

const REGENERATION_LIMIT = 10;
```

Per tailored resume (realistic case, ~3 regenerations): ₹13.55

### Batch API (Asynchronous, 50% Discount)

```typescript
const BATCH_ROUTES = {
  faq_basic: { 
    model: 'haiku', 
    questions: 25, 
    cost: '$0.025',
    latency: '24h'
  },
  faq_intermediate: { 
    model: 'haiku', 
    questions: 25, 
    cost: '$0.025',
    latency: '24h'
  },
  faq_advanced: { 
    model: 'sonnet', 
    questions: 25, 
    cost: '$0.047',
    latency: '24h'
  },
  faq_behavioural: { 
    model: 'sonnet', 
    questions: 8-10, 
    cost: '$0.019',
    latency: '24h'
  },
};
```

Per FAQ pack (Batch API): ₹11.26

---

## 7. Entitlements (Gate Everything)

One module, `src/lib/billing/entitlements.ts`:

```typescript
canTailorResume(accountId: string): boolean
canGenerateFAQPack(accountId: string): boolean
tailoredResumesRemaining(accountId: string): number
faqPacksRemaining(accountId: string): number
creditsExpireAt(accountId: string): Date | null
```

Every route that touches a premium feature checks entitlements first. No exceptions.

Free users see "Upgrade to ₹499" CTA everywhere a premium feature is referenced.

---

## 8. Locales

Both India and international at launch. User selects on signup, changeable per resume.

Config lives in `src/lib/locale/`:

| | India | International |
|---|---|---|
| Page size | A4 | Letter (A4 selectable) |
| Photo default | OFF | OFF + warning |
| Address | City, State | City, Country |
| Phone | +91 grouped | E.164 |

Never hardcode a date format, page size, or address field anywhere else.

---

## 9. Adding a Template

1. Create `src/templates/<slug>/`.
2. Export `({ data, theme, locale }: TemplateProps)`.
3. Add `<slug>.pdf.tsx` for react-pdf renderer.
4. Add `<slug>.docx.ts` mapping to Word styles.
5. Register in `src/templates/registry.ts`.
6. Add fixture snapshots for all three personas, both locales.

**Adding a template must require zero changes outside its folder and the registry.** If it doesn't, the abstraction is leaking.

---

## 10. Export Rules (Both Tiers)

- **PDF and DOCX generated from the same `ResumeData`.** Identical input → identical output.
- **PDF via `@react-pdf/renderer`. Never Puppeteer.** (No Chromium binary available on Hostinger.)
- **PDF:** Real selectable text, embedded fonts, correct page size, no orphaned headings.
- **DOCX:** Genuine Word styles (Heading 1/2, body), genuine bullet lists, opens cleanly in Word and Google Docs.
- **Post-export assertion:** Re-extract text from PDF and assert recovery of name, email, phone, every company, every job title. Failing assertion = error message + refund credit (premium only).
- **PDF rendering is queued.** One export doesn't stall concurrent requests.
- **Filenames:** `FirstName_LastName_Role_Resume.pdf`

---

## 11. Payments (Premium Only)

### Purchase Flow

1. Free tier complete → Click "Tailor for a job" or "Get Interview Prep"
2. Premium gating modal → Show ₹499 base price, ₹99 per top-up
3. Razorpay/Stripe checkout
4. One-time purchase (not subscription)
5. Webhook grants credits atomically, idempotent on provider reference

### Credit Ledger

```typescript
// One entry per purchase
credits {
  account_id,
  tailored_resume_credits: int,
  faq_pack_credits: int,
  expires_at: timestamp,      // 12 months from purchase
  created_at,
  updated_at
}

// One row per model call
usage_events {
  id,
  account_id,
  operation: 'parse' | 'analyze' | 'rewrite' | 'faq',
  model: 'haiku' | 'sonnet',
  tokens_in: int,
  tokens_out: int,
  cost_usd: decimal,
  cost_inr: decimal,
  created_at
}
```

Every model call writes `usage_events` before returning. Decrement credit inside a transaction before the call. Failure refunds atomically.

---

## 12. Testing Requirements

Every PR-sized change ships with tests:

- **Parsers (regex, pdf-parse, mammoth)** against all fixtures
- **ATS re-extraction assertion** (PDF recovery)
- **DOCX style integrity** (opens in Word and Google Docs)
- **Credit ledger:** no double-spend, no negative balance, refund on failure, webhook idempotent
- **Entitlement gates:** free accounts correctly rejected from premium features
- **Free-tier spend audit:** Assert exactly zero API calls across entire free journey
- **Both personas, both locales** render correctly in all 8 templates
- **One Playwright run:** Free flow (upload → download), then premium flow (upload → purchase → tailor → download)

Fixtures in `fixtures/`. **Never use real user data.**

---

## 13. Code Conventions

- TypeScript strict, no `any`
- Server components by default, `'use client'` only for interactivity
- Errors surface to user with actionable message
- Long operations show real progress
- Accessibility: keyboard nav, labelled inputs, WCAG AA contrast, focus rings
- Comments explain *why*, not *what*
- Money in minor units (paise, cents) as integers, never floats

---

## 14. Deployment

Hostinger Web Apps, Node.js 20, GitHub auto-deploy.

- `npm run build` includes key-leak check (fails if any Anthropic API key appears in client bundle)
- `npm run start -- -p $PORT`
- Database: external managed Postgres
- Filesystem: ephemeral (no file-based cache)

---

## 15. Commands

```
npm run dev        # development
npm run build      # production (key-leak check)
npm run test       # unit tests
npm run test:e2e   # Playwright
npm run lint
npm run typecheck
npm run db:migrate
```

---

## 16. Critical Rules

1. **Free tier: no API imports in frontend.** Ever. Not even in a comment.
2. **Free tier: no API calls.** Zero. Build-time enforcement.
3. **Premium tier: all model calls server-side.** Route handlers only.
4. **Every model call: write usage_events before returning.** No exceptions.
5. **Haiku for classification, Sonnet for generation.** Locked in routing.ts.
6. **Real-Time for user-facing, Batch for FAQs.** Locked in routing.ts.
7. **One-time payment only.** No subscriptions. No recurring charges.

---

## 17. Working Style

- Work in phases (PRODUCT_SPEC_FINAL §17). Stop at each end, report, wait before next.
- State the plan before scaffolding anything new.
- Ask rather than assume when ambiguous.
- Do not expand scope into non-goals (PRODUCT_SPEC_FINAL §4).
- If a task would violate an invariant (§2 above) or breach a cost ceiling, flag it and propose an alternative.
- Do not add dependencies without saying why standard library or existing deps won't do.

---

## 18. Decision Log (All Locked)

✓ Free tier: zero API calls (parse + format + template selection only)
✓ Premium base: ₹499 for 3 tailored resumes + 3 FAQ packs (12-month validity)
✓ Premium top-up: ₹99 bundled (1 resume + 1 FAQ pack)
✓ Model routing: Haiku (classification) + Sonnet (generation)
✓ API modes: Real-Time (user-facing) + Batch (FAQ, 50% discount)
✓ Locales: India + international at launch
✓ Margins: 84.8–85.3% worst-case across all scenarios
✓ First 400 free subscribers, then free tier closes
✓ No cover letters in v1 (v1.1 feature)
✓ No job board integration in v1 (v2.0 feature)

Ready for **HLD.md** development.
