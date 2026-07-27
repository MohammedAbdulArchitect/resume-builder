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

## PHASE 6 — JD analysis + gap flow (first AI, Haiku)

PHASE 6: First model calls. Haiku only, Real-Time. Premium-gated.

Deliver:
1. src/lib/ai/client.ts: single Anthropic client, retry + backoff. src/lib/ai/routing.ts: the task→model→mode map from MODEL_ROUTING_SPEC §2. src/lib/ai/usage.ts: writes usage_events before returning.
2. /api/analyze (Haiku RT): JD analysis + gap analysis. Debit tailored_resume_credit in the SAME transaction as the call; failure rolls back the debit (no credit lost). HLD.md §6.2, §7.3.
3. Gap report UI: matched / partial / missing, match score 0–100 with visible breakdown.
4. Skill-gap flow: per missing skill — hands-on (prompt for grounding) / knowledge (grouped under Familiar-Coursework) / skip. NEVER fabricate (CLAUDE_FINAL I2).
5. Prompts as versioned files in src/lib/ai/prompts/. Strict zod validation on responses, one retry on malformed.

Tests: Vitest — usage_events written per call, credit rolls back on simulated failure, gap scorer breakdown correct, entitlement blocks free users. Mock the Anthropic client — don't spend real tokens in tests. Playwright — premium user pastes JD, sees gap report.

Manual checklist: with a test-mode premium account, paste a real JD, confirm the gap report and that usage_events logged the Haiku call with token counts.
