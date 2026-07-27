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

## PHASE 3 — Free tier end-to-end (shippable milestone)

PHASE 3: Complete the FREE TIER end to end. This is a shippable milestone.
ZERO model calls anywhere in this phase — enforce and prove it.

Deliver:
1. Upload UI: drag-drop + picker, PDF/DOCX/TXT, 10MB cap.
2. /api/parse: pdf-parse (PDF), mammoth (DOCX), regex heuristics (TXT + section detection). NO model. Output partial ResumeData. Unclassifiable text → "Unassigned content" bucket. HLD.md §5, PRODUCT_SPEC_FINAL §7.
3. Review form: every field editable, add/remove/reorder sections, drag from Unassigned.
4. Client-side ATS score (0–100), pure function, no I/O, no API. PRODUCT_SPEC_FINAL §7.
5. Encrypt + persist ResumeData (AES-256-GCM, key from env). HLD.md §5.3.

Tests: Vitest — parsers against all fixtures, assert exactly ZERO Anthropic calls across the whole free journey (this is the critical test). Playwright — upload a fixture file, edit a field, see ATS score update, all in-browser.

Manual checklist: upload a real resume, watch it parse, correct a field, see the score change.
