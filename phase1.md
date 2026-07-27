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

## PHASE 1 — Scaffold + schema + one template

PHASE 1: Project spine only. No AI, payments, or premium features.

Deliver:
1. Next.js App Router + TypeScript strict + Tailwind + shadcn/ui, running via npm run dev.
2. Canonical ResumeData type in src/lib/schema/resume.ts + zod validator. Optional-tolerant. Per-bullet provenance (origin, originalText). This is HLD.md §5.1 — get it right.
3. Drizzle + Postgres, full schema from HLD.md §5.2, first migration. DATABASE_URL env var, nothing hardcoded.
4. Folder structure exactly per HLD.md §4 / CLAUDE_FINAL.md §4, placeholder index files where code comes later.
5. Three fixtures in fixtures/ (fresher IT, experienced non-IT, career changer) as valid ResumeData JSON.
6. ONE template ("ATS Plain") rendering a fixture as a React component. Preview only; PDF/DOCX later.

Cost-domain firewall (CLAUDE_FINAL I5/I6, HLD §3): add the lint rule now that forbids (free) route-group modules from importing src/lib/ai, even though src/lib/ai doesn't exist yet.

Tests this phase: Vitest — validate all fixtures, reject a malformed object, assert ATS Plain renders without throwing. Playwright — one test loading the preview page in real Chromium, asserting name + a company + a job title reach the DOM. Add npm scripts: test, test:e2e, typecheck, lint.
