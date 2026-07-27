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

## PHASE 8 — MVP close: tailored export + usage audit

PHASE 8: Close the MVP. Tailored resume exports end-to-end, full spend audit.

Deliver:
1. Tailored ResumeData flows through the Phase 4 export pipeline (PDF + DOCX + ATS assertion). Failed export refunds the credit.
2. Confirm the full premium journey: purchase → JD → gap → rewrite → confirm → download both formats.
3. Complete usage_events coverage: every model call logged with model, mode, tokens, cost_usd. A per-account cost view.
4. Daily spend alarm at ₹22,000 that disables new generations and notifies the operator. HLD.md §7.3.

Tests: Vitest — worst-case premium cost computed from usage_events stays under ₹76; failed export refunds credit; every model operation writes a usage row. Playwright — full premium flow upload→purchase→tailor→download both files.

Manual checklist: run the entire premium journey once in test mode, then read usage_events and confirm the real cost matches MODEL_ROUTING_SPEC estimates. THIS IS THE MVP — after this the product is shippable.
