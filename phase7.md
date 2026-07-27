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

## PHASE 7 — Bullet rewriting + editor (Sonnet)

PHASE 7: Sonnet Real-Time bullet rewriting and the draft editor.

Deliver:
1. /api/rewrite + /api/summary (Sonnet RT). Rewriting receives ONLY user-asserted facts as grounding; carries the no-fabrication constraint explicitly. MODEL_ROUTING_SPEC, CLAUDE_FINAL I2.
2. Split-view editor: structured form left, live template preview right (tabbed on mobile). Per bullet: show original + rewritten, Accept / Revert / Regenerate + free-text instruction box.
3. Regeneration counter enforced server-side, capped at 10/resume.
4. Provenance tracked per bullet; originalText retained so diff + revert work.
5. Autosave every 10s (server + local storage fallback). Nothing exports until explicit confirm.

Tests: Vitest — rewriting prompt receives only asserted facts (assert grounding contents), regen cap enforced at 10, provenance/originalText retained. Mock Anthropic. Playwright — rewrite a bullet, revert it, regenerate, confirm original is recoverable.

Manual checklist: tailor a real resume against a JD, accept/revert/regenerate bullets, confirm nothing was invented that you didn't state.
