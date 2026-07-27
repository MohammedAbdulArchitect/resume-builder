# Claude Code Phase Prompts

Ten phase prompts for building the resume web app with Claude Code. Each file
is self-contained: the standard header is already at the top, so paste the
**entire file** into a fresh Claude Code session for that phase.

## How to use

1. Have the four companion docs in the repo root: `HLD.md`,
   `PRODUCT_SPEC_FINAL.md`, `CLAUDE_FINAL.md`, `MODEL_ROUTING_SPEC.md`, plus
   `faq-format-reference.html` (needed at Phase 9).
2. Have `DATABASE_URL` ready in `.env.local` (a free Neon or Supabase Postgres).
3. Start Claude Code inside your empty cloned GitHub repo.
4. Paste `phase1.md`. Approve its plan. Let it build, test, and report.
5. Do the manual browser checklist it hands you at `localhost:3000`.
6. When happy, push to GitHub. Then paste `phase2.md`. Repeat.

## Build with Sonnet or Opus — not Fable

Your $100 Fable credit funds the **deployed app's** premium backend. Build
with a Sonnet/Opus Claude Code session so you don't spend product operating
budget on development. Tests mock the Anthropic client from Phase 6 on, so the
build never touches your API credit.

## Milestones

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
