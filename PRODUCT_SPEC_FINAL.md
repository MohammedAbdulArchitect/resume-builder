# Product Specification — ATS Resume & CV Builder (Web) — FINAL v3.0

| Field | Value |
|---|---|
| Document version | 3.0 — FINAL, locked for development |
| Date | 26 July 2026 |
| Owner | Mohammed Abdul |
| Status | **APPROVED — Ready for HLD** |
| Product identity | Standalone web app. Free tier (ATS formatting only) + Premium tier (₹499, AI-tailored). |
| Deployment target | Hostinger Web Apps, Node.js 20, GitHub auto-deploy |

**Changes in v3.0:** 
- Free tier confirmed: parse + format + ATS-optimized template selection, **zero API calls**. 
- Premium locked: ₹499 base (3 tailored resumes + 3 FAQ packs) + ₹99 top-ups (1 resume + 1 FAQ bundled).
- Model routing finalized: Haiku (classification) + Sonnet (generation), Real-Time (user-facing) + Batch (FAQs, 50% discount).
- Free tier cost: ₹0. Premium cost: ₹75.73 base, ₹25.11 per top-up. Margins: 84.8–85.3% across all scenarios.

---

## 1. Problem Statement

Candidates apply with one generic resume. Applicant Tracking Systems reject them before a human reads, for reasons the candidate never sees: wrong section headings, content in tables, unparseable dates. 

Existing tools either produce ATS-unfriendly documents or require recurring subscriptions. No free option delivers genuine ATS value.

## 2. Product Vision

**A free ATS-safe resume formatter** (no AI, no cost) plus **an optional ₹499 premium tier** that uses Claude API to tailor resumes to job descriptions and generate interview prep.

Free tier is genuinely useful: candidate gets a properly formatted, ATS-safe resume ready to download. Premium tier is a low-friction one-time purchase for power users.

## 3. Goals

| ID | Goal | Measure |
|---|---|---|
| G1 | Free tier survives ATS text extraction | 100% of contact fields, companies, titles recoverable from PDF |
| G2 | Serve freshers and experienced equally | Both personas render correctly in all templates, both locales |
| G3 | Candidate always in control | No content generated without explicit confirmation |
| G4 | Free tier costs zero to operate | Parse + format only, zero API calls, zero per-user cost |
| G5 | Premium tier is sustainably profitable | ₹499 price, 84.8–85.3% margin, worst-case cost ₹75.73/user |
| G6 | Free tier never surprises with bills | Frontend uses zero API calls. No backend model spend for free users. |
| G7 | One-time payment, no subscription friction | ₹499 + ₹99 top-ups, no recurring charges |

## 4. Non-Goals (v1)

- Job board integration or auto-apply — **planned for v2.0**
- Cover letter generation — out of v1
- LinkedIn import or scraping
- Teams, recruiter-side, multi-seat features
- Mobile native app
- Server-side resume persistence beyond what accounts require
- Subscriptions or recurring billing

---

## 5. Tiers Overview

### Free Tier — Zero API, 100% Client-Side Parsing

**What you get:**
- Upload resume (PDF, DOCX, TXT)
- Parse and edit resume structure (no model calls)
- Select from 8 ATS-optimized templates
- Live preview with locale options (India/international)
- Download resume as PDF or DOCX, unlimited times
- Export resume as JSON for re-import later

**What you DON'T get:**
- No AI tailoring
- No bullet rewriting
- No JD analysis
- No FAQ pack generation
- No gap analysis
- No summaries

**Cost to operate:** ₹0 per user (no model calls)

**User journey:**
1. Sign in with Google
2. Upload resume → Parse via regex/text extraction (zero cost)
3. Review parsed structure, edit manually
4. Select template → Live preview
5. Choose locale, page size, photo, accent color
6. Download PDF or DOCX (unlimited times)
7. Optionally export raw JSON for later re-import

---

### Premium Tier — AI-Powered Tailoring

**What you get:**
- Everything in free tier PLUS
- **Base (₹499 one-time):** 3 AI-tailored resumes + 3 interview FAQ packs
- **Top-ups (₹99 each):** 1 tailored resume + 1 FAQ pack bundled
- 12-month validity from purchase
- Real-time bullet rewriting (Sonnet model)
- JD analysis and gap reporting (Haiku model)
- Skill gap flow (hands-on vs. knowledge vs. skip)
- Up to 10 regenerations per resume
- Interview prep: 75-question packs (25 basic, 25 intermediate, 25 advanced + behavioural)

**Cost to operate:** 
- Base tier: ₹75.73 per user (worst case)
- Per top-up: ₹25.11 (worst case)
- Margins: 84.8–85.3%

**User journey:**
1. Free tier complete (resume formatted)
2. Click "Tailor for a job" → Premium gating modal
3. Purchase ₹499 via Razorpay/Stripe
4. Paste job description → JD analysis (Haiku Real-Time)
5. Review gap report → Confirm missing skills
6. Bullet rewriting (Sonnet Real-Time) → User sees draft
7. Accept/revert/regenerate bullets (max 10)
8. FAQ pack queued (Batch API) → Delivered in 24 hours via webhook/email
9. Download tailored resume + FAQ pack as PDF/DOCX

---

## 6. Data Model

Single canonical `ResumeData` type, same across free and premium:

```
ResumeData {
  meta:           { targetRole?, targetCompany?, seniority?, locale, pageSize }
  personal:       { fullName, headline, email, phone, location, links[], photo? }
  summary:        string
  experience:     [{ company, title, location, start, end, current, bullets[] }]
  education:      [{ institution, degree, field, start, end, grade?, highlights[] }]
  skills:         [{ name, category, proficiency: 'knowledge' | 'hands-on', years? }]
  projects:       [{ name, role, description, stack[], bullets[], link? }]
  certifications: [{ name, issuer, date, credentialId? }]
  achievements:   string[]
  languages:      [{ name, level }]
  publications:   [...], volunteering: [...], custom: [...]
}
```

Provenance: `origin: 'source' | 'rewritten' | 'generated'` with `originalText` retained for diffs.

---

## 7. Free Tier Implementation

### Parsing (Zero API)

No model calls. Text extraction via:

1. **PDF:** `pdf-parse` (pure JS, reads text stream)
2. **DOCX:** `mammoth` (pure JS, converts to markdown)
3. **TXT:** Direct text split + heuristic section detection via regex

Heuristic section patterns (no ML):
```
Experience: /^(Experience|Work History|Employment)/mi
Education: /^(Education|Qualifications|Degree)/mi
Skills: /^(Skills|Technical|Competencies)/mi
```

If parsing fails, text lands in "Unassigned content" bucket. User drags it into the correct section manually.

**This approach is deliberately simple and intentionally imperfect:**
- Costs zero dollars
- User adjusts manually
- That's the entire value prop of free tier

### ATS Scoring (Frontend Only)

Free tier shows an **ATS confidence score** (0–100) computed client-side, based on:

- Single-column layout ✓
- No tables or text boxes ✓
- Standard section headings ✓
- Consistent date format ✓
- Plain text contact details ✓
- Font from approved list ✓

**No API call.** Pure frontend regex and heuristic checks.

Example scoring:
```
Single column: +25 points
No tables: +15 points
Standard headings: +20 points
Consistent dates: +15 points
Contact as plain text: +15 points
Proper font: +10 points
Total: 100 points possible
```

Score displayed live as user selects template. Helps user pick the most ATS-safe option.

### Templates (Free Access)

All 8 templates available to free users. Preview rendered from user's own data.

Can switch templates unlimited times before download. No purchase needed to preview any template.

---

## 8. Premium Tier: Model Routing

**Locked decision from MODEL_ROUTING_SPEC:**

### Real-Time API (User-Facing, Synchronous)

| Task | Model | Cost | Delivery |
|---|---|---|---|
| JD analysis | Haiku | $0.006 | Sync |
| Gap analysis | Haiku | $0.006 | Sync |
| Bullet rewriting (1st pass) | Sonnet | $0.088 | Sync |
| Regenerations (per regen, max 10) | Sonnet | $0.014 each | Sync |
| Summary generation | Sonnet | $0.012 | Sync |

**Per tailored resume (realistic case, ~3 regenerations):** ₹13.55

### Batch API (Background, Asynchronous, 50% Discount)

| Task | Model | Cost | Delivery |
|---|---|---|---|
| FAQ basic (25 q) | Haiku Batch | $0.025 | 24h |
| FAQ intermediate (25 q) | Haiku Batch | $0.025 | 24h |
| FAQ advanced (25 q) | Sonnet Batch | $0.047 | 24h |
| FAQ behavioural (8–10 q) | Sonnet Batch | $0.019 | 24h |

**Per FAQ pack (Batch API):** ₹11.26

---

## 9. Pricing and Margins

### Base Tier: ₹499

| Component | Cost | Quantity | Total |
|---|---|---|---|
| Tailored resume (Real-Time Haiku+Sonnet) | ₹13.55 | 3 | ₹40.65 |
| FAQ pack (Batch Haiku+Sonnet) | ₹11.26 | 3 | ₹33.78 |
| Payment gateway (~2% + 18% GST) | — | — | ₹1.30 |
| **Total cost** | | | **₹75.73** |
| **Revenue** | | | **₹499** |
| **Gross margin** | | | **₹423.27 (84.8%)** |

### Top-Up: ₹99 (Bundled)

| Component | Cost | Quantity | Total |
|---|---|---|---|
| Tailored resume (Real-Time) | ₹13.55 | 1 | ₹13.55 |
| FAQ pack (Batch) | ₹11.26 | 1 | ₹11.26 |
| Payment gateway | — | — | ₹0.30 |
| **Total cost** | | | **₹25.11** |
| **Revenue** | | | **₹99** |
| **Gross margin** | | | **₹73.89 (74.6%)** |

### User Scenarios

| Journey | Base | Top-ups | Total Revenue | Total Cost | Profit | Margin |
|---|---|---|---|---|---|---|
| Free only | ₹0 | — | ₹0 | ₹0 | ₹0 | — |
| Premium (3+3) | ₹499 | ₹0 | ₹499 | ₹75.73 | ₹423.27 | 84.8% |
| Premium + 1 (4+4) | ₹499 | ₹99 | ₹598 | ₹100.84 | ₹497.16 | 83.1% |
| Premium + 2 (5+5) | ₹499 | ₹198 | ₹697 | ₹125.95 | ₹571.05 | 81.9% |
| Premium + 3 (6+6) | ₹499 | ₹297 | ₹796 | ₹151.06 | ₹644.94 | 81.0% |

**All premium scenarios: 81–84.8% margin.** Exceptional profitability.

---

## 10. Accounts and Authentication

- **Sign-in:** Google OAuth required (even for free tier)
- **Free account:** Always free, no credit card
- **Premium purchase:** One-time via Razorpay (India) or Stripe (international)

---

## 11. Locales — Both at Launch

| | India | International |
|---|---|---|
| Page size | A4 | Letter (A4 optional) |
| Photo default | OFF | OFF + warning |
| Address | City, State | City, Country |
| Phone | +91 grouped | E.164 |

User selects on signup, changeable per resume.

---

## 12. ATS Compliance (Both Tiers)

Hard constraints on every template (A1–A8 from MODEL_ROUTING_SPEC):

- Single-column body content
- No text inside tables, text boxes, headers, footers
- No icons carrying information
- Standard section headings only
- Consistent date format
- Approved fonts only (Inter, Calibri, Arial, Georgia, Source Sans, Lato)
- Plain hyphen or standard bullet glyph
- Contact details as plain text

**Post-export assertion:** After PDF generation, re-extract text and assert recovery of name, email, phone, every company, every job title. Failure fails the export loudly and refunds the credit (premium only).

---

## 13. Template Catalogue

Eight original templates:

1. ATS Plain — maximum parser safety
2. Modern Clean — thin accent rule, whitespace
3. Professional — conservative serif
4. Compact — dense single page
5. Fresher Focus — education/projects first
6. Executive — leadership summary, achievements
7. Academic CV — publications, grants, multi-page
8. Two-Column — sidebar (flagged as reduced ATS safety)

All render from the same `ResumeData`. Each is self-contained React component. Adding a 9th requires zero changes outside its folder and registry.

---

## 14. Data Persistence and Privacy

### Free tier:
- Resume stored encrypted (application layer)
- Uploaded source file deleted after parsing
- User can delete any resume or whole account anytime
- Hard delete within 30 days

### Premium tier:
- Same encryption
- Usage logged: model, tokens, cost (for billing and analytics only)
- 24-month retention ceiling then auto-purge with notice

**No server-side resume persistence beyond what accounts require.**

**No third-party analytics** on any page holding resume content.

**API keys server-side only.** Build-time check verifies no key leaks to client bundle.

---

## 15. Non-Functional Requirements

| ID | Requirement |
|---|---|
| N1 | Fully responsive. Editor works on mobile. |
| N2 | Accessible: keyboard navigation, WCAG AA, labelled inputs, focus rings. |
| N3 | Long operations show real progress, not indefinite spinners. |
| N4 | Per-account rate limiting on all routes. |
| N5 | Draft recovery after browser crash or reload. |
| N6 | Cold-start page load under 2 seconds. |
| N7 | PDF rendering is queued; one export doesn't stall concurrent requests. |
| N8 | **Free tier functions end-to-end with zero API calls.** No model spend. |
| N9 | Premium feature gracefully degrades if model API is unavailable. Manual edit always works. |

---

## 16. Deployment

Hostinger Web Apps, Node.js 20, GitHub auto-deploy.

- Build: `npm run build` (includes key-leak check)
- Start: `npm run start -- -p $PORT`
- Database: Managed Postgres (Neon/Supabase)
- Filesystem: Ephemeral (no file-based cache)

---

## 17. Release Phases

| Phase | Scope |
|---|---|
| 1 | Scaffold, `ResumeData` schema, one template fixture |
| 2 | Google auth, accounts, database schema |
| 3 | Upload, regex parse, review form — **free tier complete end-to-end** |
| 4 | All 8 templates, gallery, theming, both locales |
| 5 | Payments (Razorpay/Stripe), credit ledger, premium gating |
| 6 | JD analysis (Haiku RT), gap analysis, skill gap flow |
| 7 | Bullet rewriting (Sonnet RT), regenerate control, summaries |
| 8 | PDF/DOCX export, ATS re-extraction assertion, usage logging — **MVP complete** |
| 9 | FAQ generator (batched, mixed routing) |
| 10 | Polish, accessibility pass, error handling, testing |

**MVP:** Phases 1–8 (free tier + basic premium, no FAQs yet).

---

## 18. Acceptance Criteria

1. **Free tier:** Upload, parse, select template, download PDF/DOCX unlimited times. **Zero model API calls.** Regex parsing only.
2. **PDF export:** Text re-extraction recovers 100% of contact, companies, titles.
3. **DOCX export:** Opens cleanly in Word and Google Docs, editable, styles intact.
4. **Premium purchase:** Razorpay/Stripe flow works end-to-end. Credits granted atomically.
5. **Tailored resume:** Original + rewritten bullet shown side-by-side with accept/revert/regenerate controls.
6. **FAQ generation:** Batched with visible progress. Results in 24 hours via webhook.
7. **Cost audit:** Every model call logged in `usage_events`. Cost per free user < ₹1; cost per premium user (worst case) < ₹76.
8. **Both personas, both locales:** Fresher + experienced professional, India + international, all rendering correctly in all 8 templates.

---

## 19. Test Fixtures

- Fresher resume (IT)
- Experienced resume (non-IT)
- Career changer resume
- Two JDs (IT role, non-IT role)
- One fixture per locale profile

All in `fixtures/` folder. Never real user data.

---

## 20. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Free tier accidentally calls an API | Spec forbids all API calls in free tier; tests assert zero calls |
| PDF export produces unparseable text | Post-export re-extraction assertion gates every download; fail loudly |
| Model cost overruns | `usage_events` logging + daily spend alarm at ₹22,000 |
| Subscription friction pushes users away | One-time purchase eliminates recurring pain |
| Hostinger single-process PDF bottleneck | Queue rendering; N7 acceptance criterion |
| Sonnet introductory pricing expires Aug 31 | All costs assume standard $3/$15 rate |
| User exports free resume, expects AI features | Clear messaging in UI: "Upgrade for AI tailoring" everywhere |

---

## 21. Future Roadmap

**v1.1:** Cover letter generator (same JD + base resume as input, one per resume credit or separate credit type).

**v2.0:** Daily job-board scraper (LinkedIn, Indeed, Naukri, AngelList, etc.) + auto-apply agent with user consent.

---

## 22. Open Questions (Decision Points)

None. **All decisions locked:**
- Free tier: zero API calls ✓
- Premium base: ₹499 for 3 resumes + 3 FAQ packs ✓
- Top-ups: ₹99 bundled (1 resume + 1 FAQ) ✓
- Model routing: Haiku (classification) + Sonnet (generation), Real-Time + Batch ✓
- Locales: Both India and international ✓
- Margins: 84.8–85.3% ✓

Ready for **HLD.md** development.

