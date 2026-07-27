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

## PHASE 10 — Polish, accessibility, hardening

PHASE 10: Production hardening. No new features.

Deliver:
1. Accessibility pass: keyboard nav, labelled inputs, WCAG AA contrast, visible focus rings, across the whole app.
2. Error handling: every route returns structured, actionable errors. No silent catches. Real progress on every long op.
3. Per-account rate limiting on all API routes, keyed to google_sub.
4. Graceful degradation: with Anthropic unreachable, premium degrades to manual edit; free tier unaffected. Verify.
5. Full test-coverage pass across all phases. README + .env.example + Hostinger deploy steps final and verified against a clean clone.

Tests: run the entire suite. Add a11y assertions (axe) on key pages. Playwright — simulate Anthropic down, confirm manual editing + export still work.

Manual checklist: tab through the whole app with no mouse; kill the API key and confirm free tier + manual premium editing still function; do one final clean-clone deploy dry-run.
