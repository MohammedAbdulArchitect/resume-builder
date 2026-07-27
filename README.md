# ATS Resume & CV Builder

A free ATS-safe resume formatter (parse, format, template selection — zero API
calls) plus an optional one-time ₹499 premium tier that uses the Claude API to
tailor resumes to job descriptions and generate interview prep. See
`PRODUCT_SPEC_FINAL.md`, `HLD.md`, `CLAUDE_FINAL.md`, and
`MODEL_ROUTING_SPEC.md` for the full spec, architecture, and coding rules.

## Development

Requires Node.js 20.9+ (see `.nvmrc`).

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL
npm run dev                  # http://localhost:3000
```

Other scripts:

```bash
npm run build        # production build
npm run start         # serve the production build
npm run typecheck
npm run lint
npm run test          # vitest
npm run test:e2e      # playwright
npm run db:generate   # generate a Drizzle migration from src/lib/db/schema.ts
npm run db:migrate    # apply pending migrations to DATABASE_URL
```

## Deployment (Hostinger)

1. Push to `main` on GitHub — Hostinger Web Apps auto-deploys from the
   connected repo.
2. Build: `npm ci && npm run build`. Start: `npm run start -- -p $PORT`.
3. Node 20 pinned via `.nvmrc` and `engines.node` in `package.json`.
4. Set all secrets (`DATABASE_URL`, and later the Anthropic key, encryption
   key, OAuth secret, payment keys) in Hostinger's environment config — never
   in the repo.
5. `GET /api/health` returns `{ "status": "ok" }` for liveness checks.
6. Filesystem is ephemeral — no local cache or upload directory; uploads are
   processed in memory and discarded after parsing (from Phase 3 on).

## Environment variables

See `.env.example`. Only `DATABASE_URL` is required as of Phase 1; later
phases add the Anthropic key, an app-layer encryption key, Auth.js/Google
OAuth secrets, and Razorpay/Stripe keys as those features are built.

---

## Claude Code Phase Prompts

Ten phase prompts for building the resume web app with Claude Code. Each file
is self-contained: the standard header is already at the top, so paste the
**entire file** into a fresh Claude Code session for that phase.

### How to use

1. Have the four companion docs in the repo root: `HLD.md`,
   `PRODUCT_SPEC_FINAL.md`, `CLAUDE_FINAL.md`, `MODEL_ROUTING_SPEC.md`, plus
   `faq-format-reference.html` (needed at Phase 9).
2. Have `DATABASE_URL` ready in `.env.local` (a free Neon or Supabase Postgres).
3. Start Claude Code inside your empty cloned GitHub repo.
4. Paste `phase1.md`. Approve its plan. Let it build, test, and report.
5. Do the manual browser checklist it hands you at `localhost:3000`.
6. When happy, push to GitHub. Then paste `phase2.md`. Repeat.

### Build with Sonnet or Opus — not Fable

Your $100 Fable credit funds the **deployed app's** premium backend. Build
with a Sonnet/Opus Claude Code session so you don't spend product operating
budget on development. Tests mock the Anthropic client from Phase 6 on, so the
build never touches your API credit.

### Milestones

| Phase | What you have after it |
|---|---|
| 1 | Scaffold, schema, one template, deployable skeleton |
| 2 | Google sign-in, accounts, credit ledger |
| 3 | **Free tier complete and shippable** (zero model cost) |
| 4 | All 8 templates, PDF + DOCX, both locales |
| 5 | Payments and premium gating (still no AI) |
| 6 | First AI — JD analysis + gap flow (Haiku) |
| 7 | Bullet rewriting + draft editor (Sonnet) |
| 8 | **MVP complete** — full paid tailoring journey |
| 9 | FAQ packs (Batch API, styled HTML) |
| 10 | Accessibility, hardening, final deploy dry-run |

Every phase stays Hostinger-deployable from GitHub. You can import and deploy
at any point; the free tier is genuinely usable from Phase 3, the paid product
from Phase 8.
