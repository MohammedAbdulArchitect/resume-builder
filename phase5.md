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

## PHASE 5 — Payments + premium gating

PHASE 5: Payments and premium gating. Still no model calls — this wires the money, not the AI.

Deliver:
1. Razorpay (India) + Stripe (international) checkout via /api/billing/checkout.
2. Credit grant ONLY via provider webhook (/api/billing/webhook), idempotent on provider_ref. Never client-side success callback. HLD.md §11.
3. Products: base ₹499/$8.99 → 3 resume + 3 FAQ credits, 12-month expiry. topup ₹99 → 1 resume + 1 FAQ credit bundled.
4. purchases table as ledger of record. Premium gating modals on every premium feature with "Upgrade to ₹499" CTA. Free tier never sees a pay button in its core flow (CLAUDE_FINAL I12).

Tests: Vitest — webhook grants credits idempotently (replay = no-op), base grants 3+3, topup grants 1+1, credits expire correctly. Playwright — hitting a premium feature as a free user shows the upgrade modal.

Manual checklist: run a Razorpay test-mode payment, confirm credits appear only after the webhook, confirm a replayed webhook doesn't double-grant.
