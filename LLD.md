# Low-Level Design — ATS Resume & CV Builder (Web)

| Field | Value |
|---|---|
| Document | LLD v1.0 |
| Date | 27 July 2026 |
| Owner | Mohammed Abdul |
| Status | Phases 1–3 implemented and reconciled below; Phases 4–10 sections are still design-stage, each marked "Not yet implemented" with the phase that will build it |
| Based on | HLD.md, PRODUCT_SPEC_FINAL.md, CLAUDE_FINAL.md, MODEL_ROUTING_SPEC.md |

This document translates the High-Level Design (HLD) into detailed implementation specifications. It covers database queries, API contract details, component interfaces, state management, and code-level design patterns.

Originally written pre-implementation; reconciled against the real Phase
2 (auth/accounts/credit ledger) and Phase 3 (upload/parse/review/ATS
score) code in two passes — see git history for exactly which sections
came from which pass.

---

## 1. Database Queries and Operations

### 1.1 Account Management

> The 400-signup promo cap referenced in earlier drafts of this doc was
> removed from the spec (HLD, PRODUCT_SPEC_FINAL, CLAUDE_FINAL, phase2.md).
> There is no promo counter and no `is_promo` semantics anywhere in the app —
> every account is plain and equal. The `accounts.is_promo` column still
> exists in the Phase 1 migration (unused, defaults to `false`); dropping a
> live column is a schema decision left for later, not done implicitly here.

#### Upsert account (on first sign-in)

Implemented in `src/lib/db/accounts.ts` (`upsertAccountOnSignIn`), wired to
Auth.js's `jwt` callback (`src/lib/auth/index.ts`) so it runs once, on the
first token issuance after sign-in.

```sql
-- Fast path: does this google_sub already exist?
SELECT * FROM accounts WHERE google_sub = $1;

-- Existing account: just touch it.
UPDATE accounts
SET email = $2, display_name = $3, last_seen_at = NOW()
WHERE id = $1
RETURNING *;

-- New account: insert, then seed a zero-balance credits row in the same
-- transaction so entitlement checks never hit a missing row. Credits start
-- at 0/0 — they only ever come from a purchase (Phase 5), never from
-- signing up.
INSERT INTO accounts (google_sub, email, display_name, locale)
VALUES ($1, $2, $3, $4)
RETURNING *;

INSERT INTO credits (account_id, tailored_resume_credits, faq_pack_credits)
VALUES ($1, 0, 0);
```

**Race safety:** two concurrent sign-ins for the same brand-new `google_sub`
(a double-click, two tabs, two parallel test workers) both take the
"not found" branch above and both attempt the insert. Rather than adding a
heavier lock, the unique constraint on `accounts.google_sub` is the real
arbiter: the losing insert fails with Postgres error `23505`, and
`upsertAccountOnSignIn` catches that specifically (walking the error's
`.cause` chain, since Drizzle/Auth.js wrap the raw driver error at varying
depth) and falls back to updating the winner's row instead of failing the
sign-in. This was a real bug caught by `tests/e2e/upload-review.spec.ts`
racing `tests/e2e/auth.spec.ts` in parallel workers, not a hypothetical.

### 1.2 Resume Persistence

Implemented in `src/lib/db/resumes.ts` (`createResume`, `getOwnedResume`,
`updateResumeData`) and `src/lib/db/encryption.ts` (`encryptResumeData` /
`decryptResumeData` — AES-256-GCM, key from `RESUME_ENCRYPTION_KEY`, packed
as `iv(12) + authTag(16) + ciphertext`, separate from `DATABASE_URL` per
HLD §5.3). `created_at`/`updated_at` are DB defaults, not passed explicitly.

#### Save resume (encrypted)
```sql
INSERT INTO resumes (account_id, title, resume_data_encrypted)
VALUES ($1, $2, $3)
RETURNING id;

-- Update (overwrite) — ownership-scoped; returns zero rows if the resume
-- doesn't exist or isn't owned by this account, which the caller treats
-- as "not found" rather than a generic failure.
UPDATE resumes
SET resume_data_encrypted = $2, updated_at = NOW()
WHERE id = $1 AND account_id = $3
RETURNING id;
```

#### Retrieve resume
```sql
SELECT * FROM resumes WHERE id = $1 AND account_id = $2;
-- Decrypt in the application layer using RESUME_ENCRYPTION_KEY; the
-- database never sees plaintext resume content.
```

**Two write paths, both live:** `/api/parse` calls `createResume` on first
upload (Phase 3); the review form's explicit Save button calls
`updateResumeData` on the same row afterward (see §4.1).

### 1.3 Credit Ledger

Implemented in `src/lib/billing/ledger.ts`. Debit is a **single conditional
`UPDATE ... RETURNING`**, not a separate check-then-update-in-a-transaction
as earlier drafts of this doc showed — Postgres's row-level locking already
makes this atomic on its own, with no manual `SELECT ... FOR UPDATE` and no
explicit `BEGIN`/`COMMIT`/`ROLLBACK` needed:

```sql
-- Debit: zero rows returned means insufficient credit; balance untouched,
-- caller sees { ok: false, reason: "insufficient_credit" }.
UPDATE credits
SET tailored_resume_credits = tailored_resume_credits - 1, updated_at = NOW()
WHERE account_id = $1 AND tailored_resume_credits > 0
RETURNING *;

-- Refund: always succeeds, no guard needed.
UPDATE credits
SET tailored_resume_credits = tailored_resume_credits + 1, updated_at = NOW()
WHERE account_id = $1;
```

The identical pattern (`debitFaqPackCredit` / `refundFaqPackCredit`) exists
for `faq_pack_credits`, independent of the tailored-resume counter.

Entitlement reads (`src/lib/billing/entitlements.ts`) additionally treat an
**expired `expires_at` as zero remaining credits**, even when the raw
counters are still positive:

```sql
SELECT tailored_resume_credits, faq_pack_credits, expires_at
FROM credits
WHERE account_id = $1;
-- Application layer: if expires_at is in the past, both counters read as 0
-- (canTailorResume / canGenerateFAQPack return false).
```

**Not yet wired to a real spend site.** The ledger and entitlements modules
exist and are tested against the real dev database
(`tests/ledger.test.ts` — debit never negative, refund restores balance,
faq/tailored credits independent, expired credits rejected), but nothing
calls `debitTailoredResumeCredit` in a live request path yet, since
`/api/analyze` (Phase 6) is still a `501` stub.

### 1.4 Usage Logging

> **Not yet implemented** — Phase 6+ (first real model call). The
> `usage_events` table exists (Phase 1 migration) but nothing writes to it
> yet.

#### Log every model call
```sql
INSERT INTO usage_events (account_id, operation, model, mode, tokens_in, tokens_out, cost_usd, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
RETURNING id;
```

#### Daily spend check
```sql
SELECT SUM(cost_usd * 88) as cost_inr 
FROM usage_events 
WHERE account_id = $1 
AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE(created_at)
ORDER BY DATE(created_at) DESC
LIMIT 1;
```

### 1.5 FAQ Job Lifecycle

> **Not yet implemented** — Phase 9. The `faq_jobs` table exists (Phase 1
> migration) but nothing reads or writes it yet.

#### Enqueue FAQ generation
```sql
INSERT INTO faq_jobs (account_id, resume_id, batch_id, status, created_at)
VALUES ($1, $2, $3, 'queued', NOW())
RETURNING id;
```

#### Poll for completion
```sql
SELECT status, result_html, completed_at 
FROM faq_jobs 
WHERE id = $1 AND account_id = $2;
```

#### Mark complete
```sql
UPDATE faq_jobs 
SET status = 'ready', result_html = $2, completed_at = NOW()
WHERE id = $1 AND batch_id = $3;
```

---

## 2. API Routes — Detailed Contracts

### 2.1 POST /api/parse

**Purpose:** Free-tier resume parsing (zero model calls) — implemented,
`src/app/api/parse/route.ts`.

**Request:** `multipart/form-data`, a single `file` field (PDF/DOCX/TXT).
`locale` is **not** sent by the client — the server reads it off the
signed-in account's own `locale` column, so a caller can't spoof it.

**Response (200):**
```typescript
{
  resumeId: string,
  resumeData: ResumeData,      // full object, not "parsedData"
  unassigned: { id: string; text: string }[],  // not plain strings — each
                                                 // block needs a stable id
                                                 // so the review form can
                                                 // remove it once assigned
}
```

There is no `parsingConfidence` score. The heuristic parser doesn't grade
its own output — the review form's Unassigned panel and the live ATS
score are the feedback the user actually gets.

**Error responses** — one status per failure mode, not a single generic 400:

| Status | Cause |
|---|---|
| 401 | No session |
| 413 | File over 10MB (checked via `content-length` header early, and again against the actual buffer length after reading — the header can lie) |
| 415 | Extension isn't `.pdf`/`.docx`/`.txt` |
| 422 | Recognized extension but the extractor threw (corrupt file) |

**Implementation:**
```typescript
// src/app/api/parse/route.ts
export async function POST(request: Request) {
  const session = await auth();
  const accountId = session?.user?.accountId;
  if (!accountId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // ... content-length pre-check, formData(), extension whitelist,
  // 10MB buffer-length check (see actual file for the full sequence) ...

  const account = await getAccountById(accountId);
  const locale: Locale = account?.locale === 'intl' ? 'intl' : 'in';

  let result;
  try {
    result = await parseUploadedFile({ buffer, filename: file.name, locale });
  } catch {
    return Response.json({ error: 'Could not read that file...' }, { status: 422 });
  }

  const title = result.data.personal.fullName
    ? `${result.data.personal.fullName} — Resume`
    : 'Untitled Resume';
  const { id } = await createResume({ accountId, title, data: result.data });

  return Response.json({ resumeId: id, resumeData: result.data, unassigned: result.unassigned });
}
```

### 2.2 POST /api/analyze (Haiku Real-Time)

> **Not yet implemented** — Phase 6. Currently a `501` stub
> (`src/app/api/analyze/route.ts`). The request/response shapes and gap
> logic below are still design-stage; the ledger call in the snippet has
> been updated to match the real `src/lib/billing/ledger.ts` module built
> in Phase 2, so Phase 6 doesn't reinvent the debit pattern.

**Purpose:** JD analysis + gap detection

**Request:**
```typescript
{
  resumeId: string,
  jdText: string        // Job description pasted by user
}
```

**Response (200):**
```typescript
{
  gaps: {
    matched: string[],    // Skills user has
    partial: string[],    // Skills with some overlap
    missing: string[]     // Critical skills user lacks
  },
  matchScore: number,     // 0-100
  analysis: string        // Natural language summary
}
```

**Ledger Transaction:**
```typescript
export async function POST(req: Request) {
  const { accountId } = await requireAccount(); // src/lib/auth/require-account.ts
  const { resumeId, jdText } = await req.json();

  // 1. Meter before you spend (CLAUDE_FINAL.md I11): a single atomic
  // conditional UPDATE, not a manual check-then-update transaction.
  const debit = await debitTailoredResumeCredit(accountId); // src/lib/billing/ledger.ts
  if (!debit.ok) {
    return Response.json({ error: 'Upgrade required' }, { status: 403 });
  }

  try {
    // 2. Call model
    const resume = await getOwnedResume(accountId, resumeId);
    const aiResponse = await analyzeGaps(resume.data, jdText);

    // 3. Log usage
    await logUsage(accountId, 'analyze', 'haiku', aiResponse.tokens);

    return Response.json(aiResponse);
  } catch (err) {
    // 4. Model call failed after the credit was already spent — refund.
    await refundTailoredResumeCredit(accountId);
    throw err;
  }
}
```

### 2.3 POST /api/rewrite (Sonnet Real-Time)

> **Not yet implemented** — Phase 7. Currently a `501` stub.

**Purpose:** Bullet rewriting with regeneration support

**Request:**
```typescript
{
  resumeId: string,
  selectedBullets: { sectionId: string; bulletIndex: number }[],
  decisions: {
    [skillId: string]: 'hands-on' | 'knowledge' | 'skip'
  }
}
```

**Response (200):**
```typescript
{
  rewritten: [
    {
      original: string,
      rewritten: string,
      origin: 'rewritten',
      originalText: string
    }
  ],
  regenerationCount: number,  // 0 initially, incremented per regen
  summary: string
}
```

### 2.4 POST /api/faq/enqueue (Async, Batch)

> **Not yet implemented** — Phase 9. Currently a `501` stub
> (`src/app/api/faq/route.ts`).

**Purpose:** Queue FAQ generation for async processing

**Request:**
```typescript
{
  resumeId: string
}
```

**Response (202 Accepted):**
```typescript
{
  jobId: string,
  status: 'queued',
  estimatedCompletionTime: '24h'
}
```

**Implementation:**
```typescript
export async function POST(req: Request) {
  const { resumeId } = await req.json();
  
  // 1. Check entitlement
  const canGenerate = await entitlements.canGenerateFAQPack(userId);
  if (!canGenerate) return Response.json({ error: 'Upgrade required' }, { status: 403 });
  
  // 2. Debit inside transaction
  await db.transaction(async (txn) => {
    await txn.update(credits)
      .set({ faqPackCredits: sql`faq_pack_credits - 1` })
      .where(eq(credits.accountId, userId))
      .returning();
  });
  
  // 3. Build 4 batch requests
  const resume = await getResume(resumeId);
  const batchRequests = [
    buildFAQRequest('basic', 'haiku'),
    buildFAQRequest('intermediate', 'haiku'),
    buildFAQRequest('advanced', 'sonnet'),
    buildFAQRequest('behavioural', 'sonnet')
  ];
  
  // 4. Submit to Anthropic Batch API
  const batchId = await submitBatch(batchRequests);
  
  // 5. Create job record
  const jobId = await db.insert(faqJobs).values({
    accountId: userId,
    resumeId,
    batchId,
    status: 'queued'
  }).returning({ id: faqJobs.id });
  
  return Response.json({ jobId: jobId[0].id, status: 'queued' }, { status: 202 });
}
```

### 2.5 POST /api/export (Both Tiers)

> **Not yet implemented** — Phase 8. Currently a `501` stub. The
> cost-domain firewall (`eslint.config.mjs`) already covers this route,
> same as `/api/parse`, since export never touches the model either.

**Purpose:** Generate PDF or DOCX from ResumeData

**Request:**
```typescript
{
  resumeId: string,
  format: 'pdf' | 'docx',
  template: 'ats-plain' | 'modern-clean' | ... (8 total)
}
```

**Response (200):**
```
// File binary stream
Content-Type: application/pdf or application/vnd.openxmlformats-officedocument.wordprocessingml.document
Content-Disposition: attachment; filename="FirstName_LastName_Resume.pdf"
```

**ATS Assertion (PDF only):**
```typescript
// After PDF generation
const pdfText = await re_extractTextFromPDF(pdfBuffer);
const assertion = {
  hasName: pdfText.includes(data.personal.fullName),
  hasEmail: pdfText.includes(data.personal.email),
  hasPhone: pdfText.includes(data.personal.phone),
  hasAllCompanies: data.experience.every(exp => 
    pdfText.includes(exp.company)
  ),
  hasAllTitles: data.experience.every(exp => 
    pdfText.includes(exp.title)
  )
};

if (!Object.values(assertion).every(v => v)) {
  // Refund credit (premium only)
  if (data.isTailored) {
    await refundCredit(userId);
  }
  throw new Error('PDF failed ATS validation');
}
```

### 2.6 POST /api/billing/webhook (Razorpay/Stripe)

> **Not yet implemented** — Phase 5. Currently a `501` stub
> (`src/app/api/billing/route.ts`).

**Purpose:** Handle payment confirmations (idempotent)

**Request (from provider):**
```typescript
{
  event: 'payment.completed' | 'payment.failed',
  provider: 'razorpay' | 'stripe',
  provider_ref: string,  // Unique payment ID
  amount_minor: number,  // paise or cents
  product: 'base' | 'topup'
}
```

**Implementation (Idempotent):**
```typescript
export async function POST(req: Request) {
  const { provider_ref, product, amount_minor } = await req.json();
  
  // Idempotency: check if already processed
  const existing = await db.query.purchases.findFirst({
    where: eq(purchases.providerRef, provider_ref)
  });
  
  if (existing) {
    // Already processed, return 200 OK (idempotent)
    return Response.json({ status: 'already_processed' });
  }
  
  // New payment: grant credits inside transaction
  await db.transaction(async (txn) => {
    // 1. Insert into purchases (audit trail)
    await txn.insert(purchases).values({
      accountId: userId,
      provider,
      providerRef: provider_ref,
      product,
      amountMinor: amount_minor,
      currency: 'INR' // or 'USD'
    });
    
    // 2. Grant credits
    const creditGrant = product === 'base' 
      ? { tailored_resume_credits: 3, faqPackCredits: 3 }
      : { tailored_resume_credits: 1, faqPackCredits: 1 };
    
    await txn.insert(credits).values({
      accountId: userId,
      ...creditGrant,
      expiresAt: new Date(Date.now() + 12 * 30 * 24 * 60 * 60 * 1000) // 12 months
    }).onConflictDoUpdate({
      target: credits.accountId,
      set: {
        tailoredResumeCredits: sql`${credits.tailoredResumeCredits} + ${creditGrant.tailored_resume_credits}`,
        faqPackCredits: sql`${credits.faqPackCredits} + ${creditGrant.faqPackCredits}`
      }
    });
  });
  
  return Response.json({ status: 'credited' });
}
```

---

## 3. Component Architecture

### 3.1 ResumeData Type (Single Source of Truth)

The zod schema is the actual source of truth (`src/lib/schema/resume.ts`) —
TS types are `z.infer`'d from it, not hand-duplicated, so they can't drift
apart. Two things earlier drafts of this doc got wrong, both because they
under-weighted **"optional-tolerant"** (HLD §5.1): the free-tier heuristic
parser frequently can't detect a field, and the schema has to accept that
gracefully rather than reject the whole document.

```typescript
// src/lib/schema/resume.ts (abridged — see the file for every section)

export const bulletOriginSchema = z.enum(['source', 'rewritten', 'generated']);

// Named ProvenancedText, not "Bullet" — it's also used for `summary`,
// not just experience/project bullets.
export const provenancedTextSchema = z
  .object({
    text: z.string(),
    origin: bulletOriginSchema,
    originalText: z.string().optional(),
  })
  // Hard invariant, not just a convention: a 'rewritten' entry must keep
  // its originalText, or the schema rejects it outright.
  .refine((v) => v.origin !== 'rewritten' || typeof v.originalText === 'string');

// Dates are free-form strings ("Jun 2025", "2019-02", "Present"), not
// Date objects — they come from regex-matching arbitrary resume text,
// which can't be reliably parsed into a real Date without inventing a
// canonical format the user never asked for.
export const experienceEntrySchema = z.object({
  company: z.string().optional(),
  title: z.string().optional(),
  location: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  current: z.boolean().default(false),
  bullets: z.array(provenancedTextSchema).default([]),
});

// personal.fullName/email/phone are ALL optional, not required with
// z.string().email() validation — a heuristic parser routinely fails to
// find any of them, and the user fills gaps manually rather than the
// upload being rejected outright.
export const personalInfoSchema = z.object({
  fullName: z.string().optional(),
  headline: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  links: z.array(linkSchema).default([]),
  photo: z.string().optional(), // a plain string, not { dataUrl, includeInResume }
});

export const resumeDataSchema = z.object({
  meta: resumeMetaSchema.default({ locale: 'in', pageSize: 'A4' }),
  personal: personalInfoSchema.default({ links: [] }),
  summary: provenancedTextSchema.optional(),
  experience: z.array(experienceEntrySchema).default([]),
  education: z.array(educationEntrySchema).default([]),
  skills: z.array(skillEntrySchema).default([]),
  projects: z.array(projectEntrySchema).default([]),
  certifications: z.array(certificationEntrySchema).default([]),
  achievements: z.array(z.string()).default([]),
  languages: z.array(languageEntrySchema).default([]),
  publications: z.array(publicationEntrySchema).default([]),
  volunteering: z.array(volunteeringEntrySchema).default([]),
  custom: z.array(customSectionSchema).default([]),
});

export type ResumeData = z.infer<typeof resumeDataSchema>;
```

`publications`/`volunteering`/`custom` exist in the schema but have no
dedicated review-form editor yet (Phase 3's parser doesn't produce them,
and they're not part of the three fixture personas) — they stay empty
arrays until a later phase needs them.

### 3.2 Free-Tier Upload + Review (Actual Architecture)

The real thing is two routes, not one component, because the "unassigned
content" and "live ATS score" requirements need somewhere to live between
parse and save:

- **`src/app/(free)/upload/page.tsx`** (server, `requireAccount()` gate) +
  **`upload-form.tsx`** (client): drag-drop zone + file picker, client-side
  extension/size validation (defense in depth — the server re-validates),
  `fetch('/api/parse', { method: 'POST', body: formData })`. On success, it
  stashes the returned `unassigned` blocks into `sessionStorage` keyed by
  resume id (`src/app/(free)/unassigned-storage.ts`) — a parse-time-only
  concept, never persisted to the DB — then `router.push`es to
  `/review/[resumeId]`.
- **`src/app/(free)/review/[resumeId]/page.tsx`** (server,
  `requireAccount()` + ownership check via `getOwnedResume`, `notFound()`
  otherwise) + **`review-form.tsx`** (client, ~550 lines): per-section
  editors (personal, summary, experience, education, skills, projects,
  certifications, achievements, languages) with add/remove/move-up/down;
  the Unassigned panel reads its one-time sessionStorage stash on mount
  (a lazy `useState` initializer, not a `useEffect` + `setState`, to avoid
  an extra render and the SSR-has-no-`sessionStorage` problem) and offers
  both native HTML5 drag-and-drop onto a section **and** a keyboard-operable
  "Add to section" select+button per block, since drag-and-drop alone
  isn't accessible; a live `computeAtsScore` badge recomputes on every
  edit via `useMemo`.
- **`src/app/(free)/review/[resumeId]/actions.ts`**: `saveResumeData`
  Server Action — ownership check, zod-validate, `updateResumeData`. This
  is an **explicit Save button**, not autosave (CLAUDE_FINAL I3: nothing
  persists without the user seeing and confirming it). Full crash/reload
  draft recovery (NFR N5) isn't built — a page reload before saving loses
  edits, same as the parse-time Unassigned blocks.

### 3.3 Template Registry (Current State: One Template)

```typescript
// src/templates/types.ts
export interface TemplateDefinition {
  slug: string;
  name: string;
  description: string;
  component: ComponentType<TemplateProps>;
  // ATS-relevant layout facts consumed by ats/score.ts's computeAtsScore —
  // not a precomputed static atsScore number, since the score also depends
  // on the resume DATA (date-format consistency, plain-text contact info),
  // not just the template.
  isSingleColumn: boolean;
  hasTableContent: boolean;
  hasStandardHeadings: boolean;
  fontInApprovedList: boolean;
}

// src/templates/registry.ts — only one entry so far; Phase 4 adds the
// other 7. No `pdf`/`docx` dynamic-import fields yet (Phase 8).
export const templateRegistry: TemplateDefinition[] = [
  {
    slug: 'ats-plain',
    name: 'ATS Plain',
    component: AtsPlainTemplate,
    isSingleColumn: true,
    hasTableContent: false,
    hasStandardHeadings: true,
    fontInApprovedList: true,
  },
];
```

`computeAtsScore` (`src/lib/ats/score.ts`) combines these template flags
with two data-derived predicates — `hasConsistentDateFormat` (all
start/end dates across experience+education classify into the same shape:
month-year, ISO month, year-only, or slash-date) and `contactAsPlainText`
(no `<`/`>` markup leaked into email/phone/location) — per the weighting
in CLAUDE_FINAL §5: 25/15/20/15/15/10, capped at 100.

### 3.4 PDF Export (react-pdf)

> **Not yet implemented** — Phase 8. `src/lib/export/pdf/index.ts` is
> still an empty placeholder. The sketch below is unchanged from the
> original draft and remains design-stage.

```typescript
// src/lib/export/pdf.ts

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica' },
  header: { marginBottom: 20 },
  name: { fontSize: 18, fontWeight: 'bold' },
  section: { marginTop: 15, marginBottom: 10 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', borderBottomWidth: 1 }
});

export function ResumePDF({ data, template }: { data: ResumeData; template: TemplateName }) {
  const TemplateComponent = TEMPLATES[template].component;
  
  return (
    <Document>
      <Page size={data.meta.pageSize} style={styles.page}>
        <TemplateComponent data={data} mode="pdf" />
      </Page>
    </Document>
  );
}
```

---

## 4. State Management (Server + Client)

### 4.1 Resume State (Persisted, Explicit Save — Not Autosave)

**Server side:** Postgres `resumes` table (`id, account_id, title,
resume_data_encrypted, is_tailored, source_resume_id, created_at,
updated_at`).

**Client side (React):** local state, no autosave interval, no
`/api/resumes/:id` PUT route. The review form holds the draft in
`useState`, edits it immutably section-by-section, and only calls the
`saveResumeData` Server Action (§3.2, §1.2) when the user clicks Save:

```typescript
const [data, setData] = useState<ResumeData>(initialData);
// ... every section editor calls setData with an immutable update ...

async function handleSave() {
  setSaveState('saving');
  const result = await saveResumeData(resumeId, data); // Server Action
  setSaveState(result.ok ? 'saved' : 'error');
}
```

This was a deliberate choice, not an oversight: I3 ("nothing exports
without confirmation") reads naturally as "nothing *persists* without
confirmation" too, and a 10-second autosave interval is one more moving
part than this phase needed. The tradeoff: a page reload before clicking
Save loses the edits (and the Unassigned blocks, which are session-only
regardless — see §3.2). Full draft recovery (NFR N5) is future scope.

### 4.2 Credit State (Server-Rendered, No Client Fetch)

There is no `/api/credits` route. `src/app/account/page.tsx` is a Server
Component that calls the entitlements module directly during render — the
numbers are correct on first paint, no loading state, no client fetch:

```typescript
const [tailoredRemaining, faqRemaining, expiresAt] = await Promise.all([
  tailoredResumesRemaining(accountId),
  faqPacksRemaining(accountId),
  creditsExpireAt(accountId),
]);
```

When Phase 5 adds a real purchase flow, a webhook-granted credit will need
the account page to reflect the new balance — that's a `revalidatePath` /
full navigation on return from checkout, not a polling fetch loop.

---

## 5. Error Handling

> **Not yet formalized.** Routes built so far (`/api/health`, `/api/parse`,
> the Server Actions) return plain `{ error: string }` with the specific
> HTTP status the failure warrants (see §2.1's table) — no `code` field, no
> `timestamp`, no shared `apiError()` helper yet. No `ErrorBoundary`
> component exists either; the review form surfaces save failures with a
> `role="alert"` paragraph next to the Save button. The structured version
> below is a reasonable target once enough routes exist to make a shared
> helper worth it (naturally around Phase 6+, when there are real model-call
> failure modes to distinguish) — introducing it now, with two real routes,
> would be the abstraction arriving before the second or third caller needs it.

### 5.1 Standardized Error Response

```typescript
interface APIError {
  error: string;
  code: string;  // 'NO_CREDITS' | 'DB_ERROR' | 'MODEL_ERROR' | etc.
  details?: string;
  timestamp: string;
}

export function apiError(code: string, message: string, status = 400) {
  return Response.json({
    error: message,
    code,
    timestamp: new Date().toISOString()
  }, { status });
}
```

### 5.2 Error Boundaries (React)

```typescript
// src/components/ErrorBoundary.tsx

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<Error | null>(null);
  
  useErrorHandler(error);
  
  if (error) {
    return (
      <div>
        <h2>Something went wrong</h2>
        <p>{error.message}</p>
        <button onClick={() => setError(null)}>Try again</button>
      </div>
    );
  }
  
  return children;
}
```

---

## 6. Testing Strategy

What's actually built (Phases 1–3): 37 Vitest tests across 7 files, 4
Playwright specs, all passing. `tests/` at the repo root, not colocated
next to source — established in Phase 1 and kept consistent since.

### 6.1 Unit Tests (Vitest)

- `tests/schema.test.ts` — all 3 fixtures validate; a `rewritten` bullet
  missing `originalText` is rejected (the schema-level invariant, §3.1).
- `tests/ats-plain.test.tsx` — the ATS Plain template renders all 3
  fixtures without throwing.
- `tests/parsers.test.ts` — the regex heuristic parser against 3 new
  plain-text fixtures (`fixtures/*.txt`, same three personas as the JSON
  fixtures): name/company/title recovered, multi-entry experience/education
  sections split correctly, unrecognized preamble text lands in
  `unassigned`, malformed/empty input never throws.
- `tests/parsers-io.test.ts` — `pdf-parse`/`mammoth` wrappers are *mocked*
  here, deliberately: they're thin (~5 line) wrappers around mature,
  independently-tested libraries, so these tests prove *our* wrapper calls
  them correctly and propagates text/errors, rather than re-testing binary
  PDF/DOCX parsing itself. The real depth is in `parsers.test.ts`, which
  exercises the logic we actually own.
- `tests/ats-score.test.ts` — `computeAtsScore` boundary cases (each
  criterion's deduction verified independently), plus
  `hasConsistentDateFormat`/`contactAsPlainText`.
- `tests/free-tier-zero-api-calls.test.ts` — **the critical test.** Spies
  on global `fetch`, runs the entire free-tier journey (parse all 3
  fixtures, compute ATS scores) in-process, asserts `fetch` is never
  called. `src/lib/ai/client.ts` is still an empty placeholder, so there's
  no real Anthropic client to spy on yet — this is the strongest dynamic
  guarantee available now (zero network calls of any kind, which subsumes
  "zero Anthropic calls"), and it'll keep working as a regression guard
  once Phase 6 adds a real client. The ESLint cost-domain firewall
  (`eslint.config.mjs`, scoped to `(free)/**`, `api/parse/**`,
  `api/export/**`) is the complementary *static* guarantee.
- `tests/ledger.test.ts` — runs against the **real dev Neon database**
  (`tests/setup.ts` loads `.env.local`), not mocks: debit never goes
  negative, debits decrement exactly one, refund restores balance, faq and
  tailored-resume credits are independent, entitlement gates reject a
  fresh zero-credit account and an account with expired-but-positive
  credits. Each test creates and cleans up its own disposable account row.

### 6.2 Integration Tests (Playwright)

`tests/e2e/`, one `chromium` project, `fullyParallel: false` (two spec
files share a fixed test identity — see below), `webServer.env:
{ AUTH_TEST_MODE: "1" }`.

- `preview.spec.ts` — loads `/template/preview`, asserts name/company/title
  reach the DOM.
- `auth.spec.ts` — unauthenticated `/account` redirects to `/signin`; the
  test-only sign-in flow reaches `/account`.
- `upload-review.spec.ts` — signs in, uploads `fixtures/fresher-it.txt` at
  `/upload`, lands on `/review/:id`, edits the email field to include
  markup (flips `contactAsPlainText` false), watches the ATS score badge
  move from 100 to 85, saves.

**The test-only sign-in path:** a second Auth.js provider,
`credentials-test`, is added to the config **only when
`process.env.AUTH_TEST_MODE === "1"`** — never set outside the Playwright
`webServer`, never enabled in production. It runs the *real*
`upsertAccountOnSignIn` code path, just skipping Google's actual OAuth
redirect. `auth.spec.ts` and `upload-review.spec.ts` both sign in as the
same fixed identity (`test-google-sub`); cleanup happens exactly once, in
`tests/e2e/global-teardown.ts` (raw SQL, not a re-import of
`src/lib/db/accounts.ts` — Playwright's `globalTeardown` execution context
doesn't apply the same tsconfig path-alias resolution spec files get), not
per-file — a per-file `afterAll` was tried first and found to race the
*other* spec file still using that same account mid-run.

---

## 7. Deployment Checklist (Every Phase)

- [ ] Node 20 pinned in `package.json` + `.nvmrc`
- [ ] `.env.example` lists all env vars with no real values
- [ ] `/api/health` returns 200
- [ ] `npm ci && npm run build && npm run start -- -p $PORT` works
- [ ] No secrets in code (API keys, passwords, tokens)
- [ ] `.gitignore` excludes `.env.local`, `node_modules`, build artifacts
- [ ] README updated with deploy steps for Hostinger
- [ ] Clean git commits with meaningful messages

---

## 8. Performance Considerations

> Nothing in this section is implemented yet — recommendations, not
> current state. `accounts.google_sub` has a `UNIQUE` constraint (Phase 1
> migration), which Postgres backs with an index automatically; the other
> indexes below, the caching strategy, and the render queue are all still
> open for whichever phase first needs them (the render queue matters once
> Phase 8 adds real PDF export; NFR N7 already calls for it).

### 8.1 Database Indexing (Recommended, Not Yet Added)

```sql
CREATE INDEX idx_resumes_account_id ON resumes(account_id);
CREATE INDEX idx_credits_account_id ON credits(account_id);
CREATE INDEX idx_usage_events_account_id_created ON usage_events(account_id, created_at DESC);
```

### 8.2 Caching Strategy (Recommended, Not Yet Added)

- **Resume data:** Cache in memory for 10 min per user
- **Credits:** Query fresh on every paid operation (no cache)
- **Usage events:** Aggregate query cached 5 min for daily spend check

### 8.3 PDF Rendering Queue (Phase 8)

Keep concurrent renders ≤ 2 to avoid blocking other requests (NFR N7). Use
a simple in-process queue (Bull or similar) — not needed until Phase 8
adds real `@react-pdf/renderer` export.

---

## 9. Security Guidelines

- **Encryption:** AES-256-GCM for resume data at rest (app-layer)
- **Auth:** Auth.js v5, JWT session strategy — the session cookie is
  encrypted (JWE), httpOnly, secure in production. `sameSite=lax` (Auth.js's
  default), not `strict` — `strict` would drop the cookie on the top-level
  redirect back from Google's OAuth consent screen, breaking sign-in.
- **Rate limiting:** 100 requests/min per account on `/api/*` routes —
  **not yet implemented** (NFR N4); no route currently enforces this.
- **CORS:** Same-origin only — no explicit config exists; this is
  currently just Next.js's default behavior, not a deliberate Phase 1–3
  decision.
- **Input validation:** Zod on every POST/PUT — true for what's built:
  `resumeDataSchema` validates the parser's output before persistence
  (`/api/parse`) and again before every save (`saveResumeData`).
- **SQL injection:** Parameterized queries (Drizzle handles this) — holds.
- **Secrets:** Environment variables only, never in code or commits —
  holds; `.env.local`/`.env.local.txt` stay gitignored,
  `RESUME_ENCRYPTION_KEY`/`AUTH_SECRET`/`AUTH_GOOGLE_*` are placeholders
  in `.env.example`.

