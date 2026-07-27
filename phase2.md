Read the four companion docs before writing anything: HLD.md,
PRODUCT_SPEC_FINAL.md, CLAUDE_FINAL.md, MODEL_ROUTING_SPEC.md.
CLAUDE_FINAL.md §2 invariants are non-negotiable.

Read the frontend-design skill before building any UI.
Do NOT use any MCP connectors — this is a standalone app.

Working method for this phase:
1. State your plan first (file tree + build order). Wait for my approval.
2. Build.
3. Run typecheck, lint, vitest, and playwright yourself. Show output. All must pass.
4. Confirm `npm run dev` serves the page, and `npm ci && npm run build && npm run start -- -p $PORT` works.
5. Give me a short numbered manual browser checklist for localhost:3000 — what to see, what to click, what "correct" looks like.
6. Stop. Report. Do not start the next phase.

Deployment stays Hostinger-ready every phase: Node 20 pinned, .env.example
current, /api/health returns 200, README deploy steps accurate, no secrets
committed. Make clean git commits as you go.

---

## PHASE 2 — Auth + accounts + credit ledger

PHASE 2: Google auth, accounts, and the credit/ledger spine. Still no AI.

Deliver:
1. Auth.js with Google OAuth. Encrypted JWT session cookie. No password flows. Sign-in required before any resume action.
2. Account creation on first sign-in (accounts table). Persist google_sub, email, locale.
3. Credit ledger module src/lib/billing/ledger.ts: debit/refund inside DB transactions, never negative, idempotent. And entitlements.ts: canTailorResume, canGenerateFAQPack, credit counters. HLD.md §5.2, §11.
4. Account page: show credits, list saved resumes, self-service delete (resume + whole account, hard delete within 30 days).

Tests: Vitest — ledger never goes negative, refund restores balance, entitlement gates reject free accounts. Playwright — sign-in flow reaches an authenticated page (mock the Google provider). Assert an unauthenticated user is redirected.

Manual checklist must include: sign in with a real Google account, confirm account row created, confirm credits show zero.
