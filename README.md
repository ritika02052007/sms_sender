# Class Waitlist SMS Notification Job (Twilio Mock)

Internal tool for studio floor staff to manage class waitlists and notify the next person by SMS when a seat opens. It replaces paper and Excel sheets. **Twilio is fully mocked: no real SMS is sent and no real keys or phone numbers are used.**

## Features
- Dashboard with live stats (active waitlists, SMS sent today, failed SMS, average wait time)
- Per-session waitlist: search, status filter, Add to waitlist, Notify next, Notify, Confirm, Cancel
- Notification log with Retry (max attempts configurable, default 3)
- Confirmation window expiry: unconfirmed members expire and the next person is notified automatically
- Settings page (confirmation window, max retries)

## Edge cases handled
- **Empty states:** "No data found" with a helpful message, never a blank screen
- **Slow / spotty network:** skeleton loaders, button spinners, error banner with Retry, offline banner
- **Invalid input:** submission blocked, offending fields highlighted red with inline messages and `aria-invalid`
- **Crashes:** error boundary and a 404 page

## Non-functional requirements
- **Accessibility:** semantic landmarks, skip link, labelled controls, keyboard navigation, focus-trapped modal (Escape closes), `jest-axe` checks on every page
- **Telemetry:** primary actions log `[Analytics] User interacted with Class Waitlist SMS Notification Job (Twilio Mock): <action>`
- **Security:** all text input is sanitized (`src/utils/sanitize.js`) before it reaches state or storage
- **Design:** strictly monochrome; every colour lives in `src/styles/tokens.css`; spacing in 4/8/16/32px steps

## Getting started
```bash
npm install
npm run dev        # http://localhost:5173
```

| Script | Purpose |
| --- | --- |
| `npm run lint` | ESLint, fails on any warning |
| `npm test` | Vitest + Testing Library + jest-axe, with coverage |
| `npm run test:watch` | Tests in watch mode |
| `npm run build` | Production build to `dist/` |

## Project structure
```
src/
  api/          mock REST API on localStorage (latency + random failures)
  services/     Twilio mock
  components/   shared UI (Button, Modal, TextField, banners, shell)
  pages/        Dashboard, SessionWaitlist, NotificationsPage, SettingsPage, NotFound
  hooks/        useApi
  utils/        sanitize, validation, analytics, formatting
  styles/       tokens.css (only place for colours), global.css, ui.css
  tests/        test suite
docs/ARCHITECTURE.md   ERD, API contracts, job logic
PROMPTS.md             prompt log (AI-assisted workflow)
```

## Configuration
No secrets are needed. Optional mock tuning variables are listed in `.env.example` (copy to `.env`). Set `VITE_MOCK_API_FAILURE_RATE=0` for a failure-free demo. Data lives in `localStorage`; clear site data to reset the seed data.

## Deploying
The repo includes `vercel.json` (SPA rewrites). Import the GitHub repository in Vercel (or Netlify with build command `npm run build` and publish directory `dist`). No environment variables are required.

## Architecture
See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the ERD, API contracts and job logic.
