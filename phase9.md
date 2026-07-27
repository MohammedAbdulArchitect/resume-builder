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

## PHASE 9 — FAQ generator (Batch, styled HTML)

PHASE 9: FAQ pack generation. Batch API, async, styled-HTML output.

Deliver:
1. /api/faq/enqueue: debit faq_pack_credit, build 4 batch requests (basic+intermediate Haiku, advanced+behavioural Sonnet), submit to Anthropic Batch API, insert faq_jobs row. MODEL_ROUTING_SPEC §7.2.
2. /api/faq/status (poll) + /api/faq/webhook (completion). Assemble results, write usage_events ×4.
3. faqToHtml(pack, meta): emit a self-contained styled HTML guide that STRUCTURALLY MATCHES faq-format-reference.html — dark header with tag pills, sticky nav, colour-cycled cards, "what they really want to know" box, answer box with .hi highlights, do/don't grid, key-message box, STAR final-tips, footer. HLD.md §8. Inline the reference CSS.
4. In-app accordion viewer filtered by difficulty. Downloads: HTML, PDF, DOCX.
5. Question object shape per HLD §7.2 (question, whatTheyWantToKnow, answer, keyPoints, redFlag, do/dont).

Tests: Vitest — batch job lifecycle (queued→ready), faqToHtml produces valid HTML with all card sections, usage_events written. Mock the Batch API. Playwright — enqueue a pack, poll to ready (mocked), render the accordion.

Manual checklist: generate a real FAQ pack, open the HTML, compare side-by-side with faq-format-reference.html — it should look like the same product.
