# Low-Level Design — ATS Resume & CV Builder (Web)

| Field | Value |
|---|---|
| Document | LLD v1.0 |
| Date | 27 July 2026 |
| Owner | Mohammed Abdul |
| Status | Ready for implementation |
| Based on | HLD.md, PRODUCT_SPEC_FINAL.md, CLAUDE_FINAL.md, MODEL_ROUTING_SPEC.md |

This document translates the High-Level Design (HLD) into detailed implementation specifications. It covers database queries, API contract details, component interfaces, state management, and code-level design patterns.

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

#### Save resume (encrypted)
```sql
INSERT INTO resumes (account_id, title, resume_data_encrypted, is_tailored, created_at, updated_at)
VALUES ($1, $2, $3, false, NOW(), NOW())
RETURNING id, created_at;

-- Update (overwrite)
UPDATE resumes 
SET resume_data_encrypted = $2, updated_at = NOW()
WHERE id = $1 AND account_id = $3
RETURNING id, updated_at;
```

#### Retrieve resume
```sql
SELECT resume_data_encrypted, is_tailored, created_at 
FROM resumes 
WHERE id = $1 AND account_id = $2;
-- Decrypt in application layer using env key
```

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

**Purpose:** Free-tier resume parsing (zero model calls)

**Request:**
```typescript
{
  file: File,          // PDF, DOCX, or TXT
  locale: 'in' | 'intl'
}
```

**Response (200):**
```typescript
{
  resumeId: string,
  parsedData: ResumeData,
  unassignedContent: string[],
  parsingConfidence: number  // 0-100, how much of the file was understood
}
```

**Response (400):**
```typescript
{
  error: string,  // e.g., "File too large (>10MB)" or "Unsupported format"
}
```

**Implementation:**
```typescript
// src/app/api/parse/route.ts
export async function POST(req: Request) {
  const session = await auth(); // Check auth
  const formData = await req.formData();
  const file = formData.get('file') as File;
  
  // Route based on file type
  let text: string;
  if (file.type.includes('pdf')) {
    text = await parsePDF(file);
  } else if (file.type.includes('word')) {
    text = await parseDOCX(file);
  } else if (file.type === 'text/plain') {
    text = await file.text();
  } else {
    return Response.json({ error: 'Unsupported format' }, { status: 400 });
  }
  
  // Extract and heuristically classify
  const parsedData = heuristicParse(text);
  const unassigned = extractUnassigned(text, parsedData);
  
  // Persist (encrypted)
  const resumeId = await saveResume(session.user.id, parsedData);
  
  return Response.json({ resumeId, parsedData, unassignedContent: unassigned });
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

```typescript
// src/lib/schema/resume.ts

export type Bullet = {
  text: string;
  origin: 'source' | 'rewritten' | 'generated';
  originalText?: string;  // Retained for diffs/reverts
};

export type Experience = {
  company: string;
  title: string;
  location: string;
  start: Date;
  end: Date | null;
  current: boolean;
  bullets: Bullet[];
};

export type ResumeData = {
  meta: {
    targetRole?: string;
    targetCompany?: string;
    seniority?: string;
    locale: 'in' | 'intl';
    pageSize: 'A4' | 'Letter';
  };
  personal: {
    fullName: string;
    headline?: string;
    email: string;
    phone: string;
    location: string;
    links?: { label: string; url: string }[];
    photo?: { dataUrl: string; includeInResume: boolean };
  };
  summary?: string;
  experience: Experience[];
  education: [...]; // Similar structure
  skills: [...];
  projects?: [...];
  certifications?: [...];
  achievements?: string[];
  languages?: [...];
  // ... other sections
};

// Zod validator (strict)
const bulletSchema = z.object({
  text: z.string().min(10),
  origin: z.enum(['source', 'rewritten', 'generated']),
  originalText: z.string().optional()
});

const resumeDataSchema = z.object({
  meta: z.object({
    targetRole: z.string().optional(),
    locale: z.enum(['in', 'intl']),
    pageSize: z.enum(['A4', 'Letter'])
  }),
  personal: z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    phone: z.string()
    // ... others
  }),
  experience: z.array(z.object({
    company: z.string(),
    title: z.string(),
    bullets: z.array(bulletSchema)
    // ... others
  })),
  // ... others
});

export type ResumeData = z.infer<typeof resumeDataSchema>;
```

### 3.2 Free-Tier Upload Component

```typescript
// src/app/(free)/upload/page.tsx

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ResumeData | null>(null);
  
  const handleUpload = async () => {
    setParsing(true);
    const fd = new FormData();
    fd.append('file', file!);
    
    const res = await fetch('/api/parse', { method: 'POST', body: fd });
    const { resumeId, parsedData } = await res.json();
    
    setParsed(parsedData);
    // Store resumeId for downstream use
  };
  
  return (
    <div>
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button onClick={handleUpload} disabled={!file || parsing}>
        {parsing ? 'Parsing...' : 'Upload'}
      </button>
      {parsed && <ResumeEditor initialData={parsed} />}
    </div>
  );
}
```

### 3.3 Template Registry (Extensible)

```typescript
// src/templates/registry.ts

import ATSPlain from './ats-plain';
import ModernClean from './modern-clean';
// ... others

export const TEMPLATES = {
  'ats-plain': {
    name: 'ATS Plain',
    component: ATSPlain,
    pdf: () => import('./ats-plain/ats-plain.pdf'),
    docx: () => import('./ats-plain/ats-plain.docx'),
    atsScore: 100
  },
  'modern-clean': {
    name: 'Modern Clean',
    component: ModernClean,
    // ...
  }
  // ... 8 total
} as const;

export type TemplateName = keyof typeof TEMPLATES;
```

### 3.4 PDF Export (react-pdf)

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

### 4.1 Resume State (Persisted)

**Server side:** Postgres `resumes` table
```sql
id, account_id, resume_data_encrypted, is_tailored, created_at, updated_at
```

**Client side (React):** Local state + autosave
```typescript
const [resumeData, setResumeData] = useState<ResumeData>(initialData);

// Autosave every 10s
useEffect(() => {
  const interval = setInterval(() => {
    fetch(`/api/resumes/${resumeId}`, {
      method: 'PUT',
      body: JSON.stringify(resumeData)
    });
  }, 10000);
  
  return () => clearInterval(interval);
}, [resumeData, resumeId]);
```

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

### 6.1 Unit Tests (Vitest)

```typescript
// src/lib/schema/resume.test.ts

describe('ResumeData validator', () => {
  it('accepts valid resume data', () => {
    const data = { /* valid fixture */ };
    expect(() => resumeDataSchema.parse(data)).not.toThrow();
  });
  
  it('rejects malformed data', () => {
    const data = { /* missing required fields */ };
    expect(() => resumeDataSchema.parse(data)).toThrow();
  });
});
```

### 6.2 Integration Tests (Playwright)

```typescript
// e2e/free-tier.spec.ts

test('Free tier: upload → edit → download', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.click('button:has-text("Upload")');
  await page.setInputFiles('input[type=file]', 'fixtures/resume.pdf');
  // Wait for parse and verify parsed data appears
  await page.waitForSelector('input[value*="Jane Smith"]');
  // Edit a field
  await page.fill('input[value*="Engineer"]', 'Senior Engineer');
  // Download
  const downloadPromise = page.waitForEvent('download');
  await page.click('button:has-text("Download PDF")');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('Resume.pdf');
});
```

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

### 8.1 Database Indexing

```sql
CREATE INDEX idx_accounts_google_sub ON accounts(google_sub);
CREATE INDEX idx_resumes_account_id ON resumes(account_id);
CREATE INDEX idx_credits_account_id ON credits(account_id);
CREATE INDEX idx_usage_events_account_id_created ON usage_events(account_id, created_at DESC);
```

### 8.2 Caching Strategy

- **Resume data:** Cache in memory for 10 min per user
- **Credits:** Query fresh on every paid operation (no cache)
- **Usage events:** Aggregate query cached 5 min for daily spend check

### 8.3 PDF Rendering Queue

Keep concurrent renders ≤ 2 to avoid blocking other requests. Use a simple in-process queue (Bull or similar).

---

## 9. Security Guidelines

- **Encryption:** AES-256-GCM for resume data at rest (app-layer)
- **Auth:** Auth.js v5, JWT session strategy — the session cookie is
  encrypted (JWE), httpOnly, secure in production. `sameSite=lax` (Auth.js's
  default), not `strict` — `strict` would drop the cookie on the top-level
  redirect back from Google's OAuth consent screen, breaking sign-in.
- **Rate limiting:** 100 requests/min per account on `/api/*` routes
- **CORS:** Same-origin only (no cross-origin API calls)
- **Input validation:** Zod on every POST/PUT
- **SQL injection:** Parameterized queries (Drizzle handles this)
- **Secrets:** Environment variables only, never in code or commits

