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

## PHASE 4 — All templates + exports + locales

PHASE 4: All 8 templates, both export formats, both locales.

Deliver:
1. All 8 templates (HLD.md §9 list), each a self-contained React component reading ResumeData + theme + locale. Registry per CLAUDE_FINAL §9.
2. Per template: a .pdf.tsx (react-pdf, NEVER Puppeteer) and .docx.ts (real Word styles) variant.
3. /api/export: PDF + DOCX from the same ResumeData. Queue PDF rendering (concurrency ~2) so it can't stall other requests. HLD.md §9.
4. Post-export ATS assertion (ats/assert.ts): re-extract PDF text, verify name/email/phone/every company/every title recoverable. Fail loud on miss. HLD.md §9.2.
5. Template gallery with live preview + ATS score. India and international locale profiles (A4/Letter, photo default, address, phone). PRODUCT_SPEC_FINAL §11.
6. Free tier: unlimited downloads, no watermark, PDF + DOCX. Filenames FirstName_LastName_Resume.

Tests: Vitest — all 3 personas render in all 8 templates both locales; the re-extraction assertion passes on a known-good export and fails on a deliberately broken one; DOCX opens with intact styles. Playwright — select each template, download PDF, confirm a file arrives.

Manual checklist: eyeball all 8 templates in both locales — this is where you judge whether they actually look good.
