# PROMPTS.md: Prompt Traceability Log

**Project:** Class Waitlist SMS Notification Job (Twilio Mock)
**Workflow:** AI-assisted software engineering. Prompts are logged in the order they were used, with the goal, the exact prompt text (for the engineered prompts), the outcome, and what had to be corrected.
**Log date:** 30 Oct 2026

> **Tool note:** every prompt below was run in the Claude chat assistant. If you also ran any of the engineered prompts (Prompts 3 and 5) in Antigravity, write that in the "Tool" line of that entry and paste what Antigravity changed or got wrong.

## Summary

| # | Goal | Tool | Result |
|---|------|------|--------|
| 1 | Understand the TRD (in Hinglish) | Claude chat | Plain-language breakdown of requirements |
| 2 | Phased "complete code + professional style" prompt | Claude chat | Phased master prompt (architecture, tests, code, delivery) |
| 3 | Same prompt, but in one single run | Claude chat | One-shot master prompt |
| 4 | Review the generated zip ("was this all that had to be done?") | Claude chat | Audit: build blockers and 20+ gaps found |
| 5 | Audit-and-fix prompt (build, tests, features, design, docs) | Claude chat | Project rebuilt, API logic verified |
| 6 | See a live preview | Claude chat | Single-file preview of the real app |
| 7 | More stylish and attractive design | Claude chat | Hero card, icons, avatars, seat meters, polish |
| 8 | Dynamic, colourful style | Claude chat | Single-hue indigo theme with animations |
| 9-11 | Reformat CSS (navbar, sidebar, toast) as normal multi-line CSS | Claude chat | Readable CSS, content unchanged |
| 12 | Create this PROMPTS.md | Claude chat | This file |

---

## Prompt 1: Understand the TRD

**Goal:** Know exactly what the assignment asks before building anything.

**Prompt (verbatim, with the TRD attached):**
```
explain what to do in this prooject and in hinglish
```

**Outcome:** Hinglish summary of the Slack context, happy/unhappy paths, NFRs (a11y 100, telemetry log, XSS), design rules, the Antigravity TDD workflow, PROMPTS.md and the Definition of Done. Flagged that Section 4 says "Database Schema (Capstone 1)... no feature code yet" (ERD + API contracts only).

**What I had to correct:** nothing. This prompt only produced understanding.

---

## Prompt 2: Phased complete-code prompt

**Goal:** Get a prompt that generates complete code and a professional (not random-looking) UI.

**Prompt (verbatim):**
```
ohk now give the complete prompt to genereate the conpkete code and style also and look like a professional website not  a random website
```

**Outcome:** A phased master prompt (Phase 1 architecture, Phase 2 failing tests, Phase 3 implementation, Phase 4 quality and delivery, plus a strict design system). The prompt that was produced:

```
You are a senior full-stack engineer and UI designer. I am the Product Manager.
We are building "Class Waitlist SMS Notification Job (Twilio Mock)": an internal
tool for a fitness/class studio's floor staff, replacing paper and Excel sheets.
When a seat opens in a class, staff notify the next person on the waitlist by
SMS. Twilio must be MOCKED (no real SMS, no real keys).

Work in strict phases. Finish one phase, show me the result, and WAIT for my
"proceed" before starting the next. Do not skip ahead.

============================================================
TECH STACK
============================================================
- React 18 + Vite, JavaScript (or TypeScript if I say so)
- Vitest + React Testing Library + jest-axe for tests
- ESLint (zero warnings, no unused imports)
- Plain CSS with CSS variables (no UI libraries, no Tailwind)
- Data layer: a mock API service (src/api/) backed by localStorage that
  simulates network latency (600-1200ms) and random failures, exposing
  the exact REST contracts defined in Phase 1
- Mock Twilio service (src/services/twilioMock.js) that returns realistic
  responses: { sid, status: 'queued' | 'delivered' | 'failed', to, body,
  dateCreated }. Failed ~15% of the time to exercise retry logic
- No real API keys, no real phone numbers, no PII hardcoded. Use fake data only

============================================================
PHASE 1: ARCHITECTURE ONLY (no feature code)
============================================================
Create docs/ARCHITECTURE.md containing:
1. ERD (Mermaid erDiagram) for: members, classes, class_sessions,
   waitlist_entries (position, status: waiting | notified | confirmed |
   expired | cancelled), notifications (SMS log: status, attempts,
   twilio_sid, error_message, sent_at), staff_users
2. Column names, types, PK/FK, unique constraints, indexes, and why
3. API contracts for every endpoint: method, path, request body, success
   response, error response, status codes. Include at minimum:
   - GET /api/sessions
   - GET /api/sessions/:id/waitlist
   - POST /api/sessions/:id/waitlist (join)
   - PATCH /api/waitlist/:id (status change)
   - DELETE /api/waitlist/:id
   - POST /api/sessions/:id/notify-next (triggers the SMS job)
   - POST /api/notifications/:id/retry
   - GET /api/notifications
4. Standard error format { error: { code, message, fields? } }
5. Waitlist job logic: when a seat opens, pick next "waiting" entry by
   position, send mock SMS, mark "notified", set a confirmation window,
   expire and move to next if not confirmed, retry failed SMS up to 3 times
6. Design tokens section (see Design System below)
Then STOP and wait for approval.

============================================================
PHASE 2: TESTS FIRST (they must FAIL)
============================================================
Write the full Vitest suite BEFORE any implementation, covering:
HAPPY PATH
- Dashboard renders sessions and waitlist clearly
- UI responds immediately to input (optimistic updates, no long blocking)
- Data returned by the API layer matches the documented schema
UNHAPPY PATH
- Empty state: empty list or empty search shows "No data found" with a
  helpful message (never a blank screen)
- Slow network: a visible loading indicator (role="status", aria-busy)
  appears during every async call and disappears after
- Failed request: error banner with a Retry button, app does not crash
- Invalid input: empty or malformed name/phone/email blocks submission,
  offending fields get a red border + inline error message + aria-invalid
- Offline: navigator offline event shows an offline banner
NFR
- Accessibility: jest-axe reports zero violations on every page/modal;
  all buttons/inputs have accessible names; full keyboard navigation;
  visible focus rings; modals trap focus and close on Escape
- Telemetry: every primary action (join waitlist, notify next, retry SMS,
  cancel entry) logs exactly:
  "[Analytics] User interacted with Class Waitlist SMS Notification Job (Twilio Mock): <action>"
- Security: sanitize all text inputs against XSS BEFORE storing in state
  (e.g. "<script>alert(1)</script>" and "<img onerror=...>" are neutralized)
- Twilio mock: success, failure, and retry-after-failure paths
Run the tests, show me that they fail, then STOP.

============================================================
PHASE 3: IMPLEMENTATION (make the tests pass)
============================================================
Implement the app so ALL tests pass. Pages/components:
1. App shell: top navbar (logo, nav, staff avatar), left sidebar or tab nav,
   main content, footer. Fully responsive (mobile, tablet, desktop)
2. Dashboard: summary stat cards (Active waitlists, Notifications sent
   today, Failed SMS, Avg. wait time) + upcoming sessions table
3. Session Waitlist view: ordered waitlist table with position, member,
   masked phone, status badge, time joined, and row actions
   (Notify, Cancel). Search + status filter. "Notify Next" primary button
4. Add to Waitlist modal/form with validation (name, phone, email, session)
5. Notification Log page: table of SMS attempts with status badge, attempts,
   timestamp, Retry button for failed ones. Mock SMS preview drawer
6. Toast notifications for success/failure
7. Skeleton loaders for tables, spinner for buttons
8. Settings page (confirmation window, max retries). Keep it simple
Include seed data (15-20 fake members, 6 sessions). Mask phone numbers in UI
(e.g. +91 ••••• ••421). Add a /404 page and an error boundary.

============================================================
DESIGN SYSTEM (STRICT)
============================================================
Clean, corporate, monochromatic. Think Linear / Stripe dashboard.
- Define ALL colors as CSS variables in src/styles/tokens.css using only a
  grayscale/slate scale (e.g. --gray-50 ... --gray-900) plus ONE functional
  accent set for status: red for errors only. No other hex values anywhere
  else in the codebase. Never hardcode a hex outside tokens.css
- Spacing scale: 4/8/16/32/48/64px only (16px and 32px as main steps)
- Typography: Inter (system-ui fallback), clear scale: 12/14/16/20/24/32,
  weights 400/500/600
- Radius 8px, subtle 1px borders, very soft shadows, generous whitespace
- Status badges via shade/outline differences (not rainbow colors)
- Buttons: primary (dark fill), secondary (outline), ghost; consistent
  height 40px; hover/active/focus/disabled states
- Tables: sticky header, zebra or hairline rows, aligned columns
- Contrast ratio at least 4.5:1 for all text (needed for Lighthouse 100)
- Subtle transitions (150ms), respect prefers-reduced-motion
- Must look like a polished SaaS admin product, not a template or demo

============================================================
ACCESSIBILITY CHECKLIST (target Lighthouse a11y = 100)
============================================================
Semantic HTML (header, nav, main, footer, table with caption/scope),
one h1 per page, labels tied to inputs, aria-live for toasts/loading,
skip-to-content link, lang attribute, meta viewport, page <title>,
alt text, no color-only meaning, logical tab order.

============================================================
PHASE 4: QUALITY + DELIVERY
============================================================
- Run eslint: zero warnings, remove unused imports
- Run all tests: 100% passing
- Add README.md: setup, scripts, architecture summary, how to test
- Add .env.example (no real keys)
- Add vercel/netlify-ready build config so I can deploy a live link
- Create PROMPTS.md in the repo root, logging every prompt I used, in order
- Final summary: how each Definition of Done item was satisfied

============================================================
RULES
============================================================
- If something breaks, I will paste the error. You must say what went wrong,
  revert, and try a different approach. Don't patch blindly
- Keep files small and organized (components/, pages/, api/, services/,
  hooks/, utils/, styles/, tests/)
- Ask me before adding any dependency not listed above
- Begin with Phase 1 now.
```

**What I had to correct:** the phased approach needs a "proceed" between phases, which was not what I wanted. See Prompt 3.

---

## Prompt 3: One-shot complete prompt

**Goal:** Get everything generated in one continuous run, with no waiting between phases.

**Prompt (verbatim):**
```
.give me complete prompt in one time
```

**Outcome:** A single master prompt with no phase gates (architecture, then failing tests, then implementation, then lint/test fix, then docs). The prompt that was produced:

```
You are a senior full-stack engineer and product designer. Build the COMPLETE
project below in ONE continuous run. Do not stop to ask questions or wait for
approval; make sensible decisions and document them. Internally follow this
order: architecture docs -> failing tests -> implementation -> lint/test fix
-> docs. At the end, run the tests and linter, fix anything failing, and
print a final summary.

PROJECT
"Class Waitlist SMS Notification Job (Twilio Mock)": an internal web tool for
a class/fitness studio's floor staff, replacing paper and Excel sheets that
cause data loss and slowdowns. When a seat opens in a class, staff notify the
next person on the waitlist by SMS. Twilio is MOCKED: no real SMS, no real
keys, no real phone numbers, no real PII. It must look like a polished,
professional SaaS admin product (Stripe / Linear dashboard quality), not a
demo or template. It must never crash on a spotty connection.

TECH STACK
- React 18 + Vite (JavaScript), React Router
- Vitest + React Testing Library + jest-axe
- ESLint: zero warnings, no unused imports
- Plain CSS with CSS variables (no UI libraries, no Tailwind, no CDN)
- Mock API layer in src/api/ backed by localStorage, simulating latency
  (600-1200ms) and random failures (~10%), exposing the REST contracts below
- Mock Twilio service in src/services/twilioMock.js returning
  { sid, status: 'queued'|'delivered'|'failed', to, body, dateCreated };
  ~15% failures to exercise retry logic
- Folder structure: src/{components,pages,api,services,hooks,utils,styles,tests}

STEP 1: ARCHITECTURE (docs/ARCHITECTURE.md)
- Mermaid ERD for: members, classes, class_sessions, waitlist_entries
  (position, status: waiting|notified|confirmed|expired|cancelled),
  notifications (status, attempts, twilio_sid, error_message, sent_at),
  staff_users. Include PK/FK, types, unique constraints, indexes, rationale
- API contracts (method, path, request, success response, error response,
  status codes): GET /api/sessions, GET /api/sessions/:id/waitlist,
  POST /api/sessions/:id/waitlist, PATCH /api/waitlist/:id,
  DELETE /api/waitlist/:id, POST /api/sessions/:id/notify-next,
  POST /api/notifications/:id/retry, GET /api/notifications
- Standard error format: { error: { code, message, fields? } }
- Job logic: seat opens -> pick next "waiting" by position -> send mock SMS ->
  mark "notified" -> confirmation window -> expire and move to next if not
  confirmed -> retry failed SMS up to 3 times
- Design tokens summary

STEP 2: TESTS FIRST (Vitest), written before implementation
Happy path:
- Dashboard and waitlist render clearly
- UI responds immediately (optimistic updates)
- API data matches the documented schema (consistent structure)
Unhappy path:
- Empty list or empty search shows a friendly "No data found" message,
  never a blank screen
- Visible loading indicator (role="status", aria-busy) during every async
  call, removed afterwards (assume slow 3G)
- Failed request shows an error banner with Retry; app never crashes
- Missing/malformed name, phone, email blocks submit; offending fields get
  a red border, inline message, and aria-invalid="true"
- Offline event shows an offline banner
NFRs:
- jest-axe: zero violations on every page and modal; all buttons/inputs have
  accessible names/ARIA labels; full keyboard navigation; modals trap focus
  and close on Escape
- Telemetry: every primary action (join waitlist, notify next, retry SMS,
  cancel entry) logs exactly:
  "[Analytics] User interacted with Class Waitlist SMS Notification Job (Twilio Mock): <action>"
- XSS: all text inputs sanitized BEFORE being stored in state
  ("<script>alert(1)</script>" and "<img src=x onerror=...>" neutralized)
- Twilio mock success, failure, and retry paths

STEP 3: IMPLEMENTATION (make all tests pass)
Pages and features:
1. App shell: top navbar (logo, page title, staff avatar menu), sidebar nav
   (Dashboard, Waitlists, Notifications, Settings), footer. Responsive for
   mobile, tablet, desktop
2. Dashboard: 4 stat cards (Active waitlists, SMS sent today, Failed SMS,
   Avg. wait time) + upcoming sessions table
3. Session Waitlist page: ordered table (position, member, masked phone,
   status badge, time joined, row actions Notify/Cancel), search, status
   filter, prominent "Notify Next" button, "Add to Waitlist" button
4. Add to Waitlist modal with full validation (name, phone, email, session)
5. Notification Log page: table (member, message, status badge, attempts,
   timestamp), Retry button on failed rows, SMS preview drawer
6. Settings page: confirmation window (minutes), max retries
7. Toasts (aria-live), skeleton loaders for tables, spinners on buttons,
   error boundary, 404 page
8. Seed data: 6 sessions and 18 fake members. Mask phones in UI
   (e.g. +91 ••••• ••421)

DESIGN SYSTEM (STRICT, monochromatic corporate)
- All colors defined ONLY in src/styles/tokens.css as CSS variables, using a
  slate/gray scale (--gray-50 to --gray-900) plus one red for errors. No hex
  codes anywhere else in the codebase. No rogue colors
- Spacing scale: 4/8/16/32/48/64px (16px and 32px are the main steps)
- Typography: Inter with system-ui fallback; sizes 12/14/16/20/24/32;
  weights 400/500/600
- 8px radius, 1px hairline borders, very soft shadows, generous whitespace
- Buttons 40px height: primary (dark fill), secondary (outline), ghost, with
  hover/active/focus/disabled states
- Status badges differentiated by shade and outline, not rainbow colors
- Tables: sticky header, hairline row dividers, aligned columns
- Text contrast at least 4.5:1; 150ms transitions; respect
  prefers-reduced-motion
- Clear visual hierarchy, consistent alignment, polished empty states with
  simple inline SVG icons

ACCESSIBILITY (target Lighthouse a11y = 100)
Semantic HTML (header/nav/main/footer), one h1 per page, table captions and
scope attributes, labels tied to inputs, skip-to-content link, html lang,
meta viewport, descriptive <title>, visible focus rings, no color-only
meaning, logical tab order, aria-live regions for toasts and loading.

STEP 4: QUALITY AND DELIVERY
- Run eslint and fix until zero warnings; remove unused imports
- Run vitest and fix until all tests pass
- Verify no real keys or PII are hardcoded; add .env.example
- README.md: setup, scripts, architecture summary, how to run tests
- Add vercel.json (or netlify.toml) so it deploys with one click
- Create PROMPTS.md in the repo root documenting this prompt and the sequence
  of follow-up prompts used (leave a template for me to append future ones)
- Final output: a Definition of Done checklist showing each item as met

RULES
- If something fails, diagnose, revert the faulty approach, and try a
  different method; do not patch blindly
- Do not add dependencies beyond the stack listed above
- Keep code clean, commented where non-obvious, and files small
```

**Outcome (of running this prompt, as seen in the generated zip):** a partial project. Layout, mock API, Twilio mock, tokens and an ERD existed, but the app could not build and most requirements were missing. See Prompt 4.

**What I had to correct:** a one-shot prompt this large produced incomplete output. The gaps are listed in Prompt 4 and fixed by Prompt 5.

---

## Prompt 4: Review of the generated project

**Goal:** Check whether the generated project actually satisfied the TRD.

**Prompt (verbatim, with `sms_sender__2_.zip` uploaded):**
```
is it complete or not
```

**Outcome:** An audit of every file in the zip. Findings:
- **Build blockers:** `SettingsPage.jsx`, `NotFound.jsx`, `Dashboard.css`, `SessionWaitlist.css`, `NotificationsPage.css`, `Footer.css` were imported but missing.
- **Missing deliverables:** no tests, no PROMPTS.md, no deploy config, README still the Vite default.
- **Missing requirements:** no `[Analytics]` logging, no XSS sanitizing, no form validation (an `alert()` placeholder), no offline banner, no error boundary, no Retry on error, "No entries found" instead of "No data found".
- **Logic bugs:** `retryNotification` never called the Twilio mock again, dashboard stats hardcoded to 0, `useApi` re-ran forever when given an inline callback, ERD had two wrong relations.
- **Config problems:** two ESLint configs, `--ext` in the lint script, missing dev dependencies.

**What I had to correct:** everything above, via Prompt 5.

---

## Prompt 5: Audit-and-fix prompt

**Goal:** Make the project build, add a TDD suite, implement all missing features, polish the design, and finish the docs.

**Prompt (verbatim):**
```
The current project is incomplete and fails to build. Audit it and fix
everything below, in one continuous run, without asking me questions.

BUILD BLOCKERS
- App.jsx imports SettingsPage.jsx, NotFound.jsx, Dashboard.css,
  SessionWaitlist.css, NotificationsPage.css which do not exist. Create them.
- Remove the duplicate .eslintrc.cjs, keep only eslint.config.js (flat
  config, with react plugin and browser globals). Fix the lint script
  (no --ext). Add missing dev dependencies (@eslint/js, globals,
  @vitest/coverage-v8). Add a Vitest config (jsdom, setupFiles for
  jest-dom) and src/tests/setup.js.

TESTS (write first, then make them pass)
Create src/tests/ with Vitest + React Testing Library + jest-axe covering:
empty state ("No data found"), loading indicator (role=status), error
banner with Retry, invalid form blocks submit with red border +
aria-invalid + inline message, offline banner, zero axe violations on every
page and modal, analytics log, XSS sanitization, Twilio mock
success/failure/retry (max 3 attempts).

MISSING FEATURES
- Analytics: every primary action (join waitlist, notify next, notify
  single, retry SMS, cancel entry) logs exactly:
  "[Analytics] User interacted with Class Waitlist SMS Notification Job (Twilio Mock): <action>"
- src/utils/sanitize.js: strip/escape HTML before storing any input in state
- Real "Add to Waitlist" modal (focus trap, Escape closes) with validation
  for name, phone, email; replace all alert() calls with real behavior
- Implement "Notify" for a single entry
- retryNotification must call sendSms again, increment attempts, stop at 3
- Confirmation window expiry: notified entries not confirmed in time become
  "expired" and the next waiting person is notified; recalc positions
- Dashboard stats computed from real data (SMS sent today, Failed SMS,
  active waitlists, average wait time)
- Replace "No entries found" with a friendly "No data found" empty state
- Skeleton loaders for tables, button spinners, error banner with Retry
- Offline banner, ErrorBoundary, NotFound page, Settings page
  (confirmation window, max retries)
- Seed members with realistic fake names instead of "Member 1"

DESIGN (professional SaaS look, strictly monochrome)
- Remove inline styles; style everything via CSS using only variables from
  tokens.css (no hex outside tokens.css). Spacing 16/32px steps
- Polished navbar, sidebar with active state, stat cards, tables with sticky
  header and hairline dividers, status badges (shade/outline based), 40px
  buttons with primary/secondary/ghost variants, focus rings, 4.5:1 contrast
- Semantic HTML, one h1 per page, table captions/scope, skip-to-content link

DOCS AND DELIVERY
- Fix ERD: WAITLIST_ENTRIES ||--o{ NOTIFICATIONS, and remove the
  MEMBERS-attends-CLASS_SESSIONS relation
- Replace README with real setup/test/deploy docs; add vercel.json and
  .env.example
- Create PROMPTS.md in the root
- Finally run: npm run lint (zero warnings), npm test (all pass),
  npm run build (succeeds). Fix until all pass, then print a Definition of
  Done checklist.
```

**Outcome:**
- All missing files created; duplicate ESLint config removed; flat config, Vitest config and test setup added.
- Test suite written in `src/tests/` (sanitize, validation, Twilio mock, API logic, and full-app UI tests with jest-axe).
- All listed features implemented (modal with focus trap, notify single, confirm, cancel, retry max 3, expiry job, real stats, skeletons, offline banner, error boundary, 404, settings).
- ERD fixed; README, `vercel.json`, `.env.example` and this file added.
- Verified: API logic (validation, XSS, positions, retry cap, expiry), syntax of every file, no hex outside `tokens.css`, no inline styles, no unused imports.

**What I had to correct / limits:**
- `npm install` was blocked in the sandbox (no network), so `npm run lint`, `npm test` and `npm run build` were **not** run. They must be run locally: `npm install && npm run lint && npm test && npm run build`.
- Because `npm install` failed, the new dev dependencies were added to `package.json` manually; versions need confirming on first install (delete the stale `package-lock.json` first).

---

## Prompt 6: Preview

**Goal:** See the app running without installing anything.

**Prompt (verbatim):**
```
i want to see preview of this
```

**Outcome:** The real source was bundled into a single HTML file (with a small in-memory router stand-in, since the router package was not installable) and published as a preview. Smoke-tested in headless Chromium (dashboard, waitlist, modal validation, notifications): no console errors.

**What I had to correct:** nothing. Known limit: preview routing is in-memory (URL does not change, refresh returns to the dashboard).

---

## Prompt 7: More stylish design

**Goal:** Make the UI more attractive.

**Prompt (verbatim):**
```
please improve the style of this
```

**Outcome:** Added a hero card for the next session, icon stat cards, member avatars with initials, position chips, seat-progress meters, status badges with dots, sticky gradient navbar, sidebar "Twilio mock mode" note, blurred modal backdrop, shimmer skeletons and toast animations. Colours stayed in `tokens.css` and the palette stayed monochrome to respect the TRD.

**What I had to correct:** the Cancel button in the waitlist table was clipped by horizontal overflow. Fixed by shortening the date format (no year), tightening ghost-button padding and the avatar gap.

---

## Prompt 8: Dynamic, colourful style

**Goal:** More colour and motion.

**Prompt (verbatim):**
```
thoda dynamic colorful style ka use karo na
```

**Outcome:** Switched to a single-hue indigo palette (with a violet tint for gradients) defined as tokens, so the TRD's "monochromatic, no rogue hex" rule still holds. Added an animated gradient hero with floating shapes, staggered entrance animations for cards and table rows, hover lift and glow, a pulsing live dot, and coloured avatars. Motion is disabled under `prefers-reduced-motion`.

**What I had to correct:** the first screenshot was captured mid-animation (faded cards). Re-captured after the animations settled to verify the real look. Flagged that contrast must be re-checked with Lighthouse after the colour change.

---

## Prompts 9-11: CSS reformatting (navbar, sidebar, toast)

**Goal:** Convert compact one-line CSS rules to normal multi-line CSS, content unchanged.

**Prompts (verbatim, CSS bodies omitted for brevity):**
```
[navbar CSS pasted] ise  ek normal css me convert karo jaise ke ek normal coder likhta hai content same hi rakna
```
```
[sidebar CSS pasted] same ise bahi aise hi karo
```
```
[toast CSS pasted] same ise bhi
```

**Outcome:** Each block was rewritten with one property per line and blank lines between rules; selectors, properties and values were not changed.

**What I had to correct:** the pasted CSS was the earlier gray version, while the project zip has the newer colourful version. This was pointed out so the two are not mixed up.

---

## Prompt 12: This file

**Goal:** Produce a complete PROMPTS.md containing every prompt, added by the assistant.

**Prompt (verbatim):**



**Outcome:** This file, saved as `PROMPTS.md` in the repo root (the TRD requires that exact name).

---

## Reflections (what this log teaches about prompt engineering)

1. **Phase gates vs one-shot:** the phased prompt gave control but needed many round trips; the one-shot prompt was faster but produced an incomplete project. A good middle path is one-shot with a hard verification step at the end (lint, test, build) that the AI must actually pass.
2. **Verify, do not trust:** the first generated project looked finished but could not build. Asking "was this all?" and auditing file by file found the gaps.
3. **Be specific about the unhappy path:** the fix prompt worked because every requirement was a concrete, testable sentence (exact log string, exact empty-state text, exact retry limit).
4. **Constraints survive restyling:** every visual change was checked against the TRD rules (tokens only, no inline styles, 16/32px spacing, reduced motion).
5. **Be honest about verification limits:** tests, lint and build still need to be run locally; the log records exactly what was and was not verified.