# Venturely

A platform where ambitious students find teammates, build meaningful projects, keep an evidence-backed portfolio, appear on a transparent leaderboard, and get honest feedback from an AI mentor.

The brand name lives in `src/lib/brand.ts` (plus the logo in `src/components/app/logo.tsx`), so it's easy to change.

---

## Features

| Area | What works |
| --- | --- |
| **Auth** | Sign up (13+ confirmation, terms), sign in, sign out, password reset (single-use, 1-hour tokens, signs out other sessions), change password, delete account. DB-backed sessions with HTTP-only cookies and sliding expiry. Rate-limited. |
| **Onboarding** | 5-step flow: basics + avatar, about, skills with proficiency, interests and roles, availability, links and privacy. Progress is saved after each step and you can finish later. |
| **Profiles** | Shareable `/u/[username]` pages with an editorial portfolio, achievements (verified vs. self-reported), project contributions, ranking breakdown with history, skills and links. Visibility can be public, members-only (the default) or private. |
| **Portfolio** | Create, edit, reorder (keyboard-accessible) and delete portfolio entries and achievements. Users can request verification; a moderator reviews it. Editing a verified claim resets it to self-reported. |
| **Discovery** | Server-side search, filtering (major, skills, category, experience, availability, language, interests) and pagination, plus relevance, ranking and newest sorts. Search is debounced and filters live in the URL. |
| **Leaderboard** | Global and 6 category boards, 7-day movement, verified share, a provisional flag, and a public methodology page. |
| **Projects** | Create, edit, archive and restore. Open roles, milestones with owners and evidence, an activity feed, applications, invitations, member roles (owner/admin/member), leaving a project, and peer feedback. Explore page and "Your projects". |
| **Collaboration** | Requests inbox (invitations, applications to review, your applications, sent invitations), notifications, saved profiles, blocking, reporting. |
| **AI Mentor** | **Teammate Matcher** (hybrid: deterministic scoring over real profiles, then AI explanations; works without AI in skill-based mode). **Project Evaluator** (10 qualitative dimensions, risks, missing evidence, milestones, approaches, questions; history). **Project Copilot** (persistent conversations linked to a project, history controls, and edits you review before they're applied). |
| **Moderation** | `/admin` queue for verification requests and reports, account suspension, and a manual ranking recompute. |
| **Landing & legal** | Landing page built from real app components with fictional example data, plus privacy, terms, community guidelines and contact pages. |

---

## Architecture

```
Next.js 15 (App Router, RSC) ── server components read via services
        │                        client components call server actions
        ▼
src/actions/*        thin "use server" wrappers: auth → zod parse → service → revalidate
src/server/services  business logic + authorization (testable, no Next context)
src/server/ai        AI service layer: config, provider interface, Anthropic provider,
                     guards, budgets, runner, matcher, evaluator, copilot
src/lib              pure shared code: taxonomy, zod schemas, ranking formula, matching
prisma/              schema, migrations, seed
```

* **Stack:** Next.js 15 · React 19 · TypeScript (strict, `noUncheckedIndexedAccess`) · Tailwind CSS v4 · Radix primitives styled as an in-house shadcn-style system · Lucide icons · React Hook Form + Zod · PostgreSQL + Prisma 6 · `@anthropic-ai/sdk` · Vitest + Playwright.
* **Auth:** A small custom session system (`src/server/auth`). Credentials auth with database sessions keeps revocation, password reset and suspension simple and fully under test. Only the SHA-256 hash of each token is stored, and cookies are `httpOnly`, `sameSite=lax`, and `secure` in production. `middleware.ts` checks only that a cookie exists, so redirects happen early; every page and action validates the session on the server.
* **Server actions** all go through `authedAction`/`runAction` (`src/server/action.ts`). These map expected `AppError`s to typed results and hide internal errors. Next.js checks the origin on server actions, which protects them from CSRF.
* **Design system:** tokens live in `src/app/globals.css` (warm paper, ink, one forest-green accent, radii, shadows, motion). Primitives are in `src/components/ui`, domain components in `src/components/{profile,project,ranking,ai}`, and the app shell in `src/components/app`.

### Database (Prisma models)

`User`, `Session`, `PasswordResetToken`, `RateLimitBucket`, `Profile`, `Skill`, `UserSkill`, `Achievement`, `PortfolioItem`, `Project`, `ProjectMember`, `ProjectRole`, `CollaborationInvitation`, `ProjectApplication`, `ProjectMilestone`, `PeerFeedback`, `ActivityEvent`, `RankingRun`, `RankingSnapshot`, `SavedProfile`, `Notification`, `Block`, `Report`, `AIConversation`, `AIMessage`, `AIProjectAssessment`, `AIMatchRun`, `AIUsage`.

Deleting a user cascades to all of their personal data. Ownership of their projects passes to a teammate first. Indexes cover discovery, leaderboards, inboxes and feeds.

### Ranking (`src/lib/ranking/formula.ts`)

The scoring model is a pure function of database records and is documented in the file header and at `/leaderboard/methodology`. A score has five signals, each with decay and caps so volume can't beat quality:

1. **Achievements:** verified achievements count in full (school 8, regional 16, national 30, international 45). Self-reported ones count at 25%, capped at 20 points.
2. **Project outcomes:** points by stage. "Launched"/"completed" only count when outcomes are documented *and* a demo or repo is linked. Only the top 5 projects count, the project must be 14+ days old, and the membership 7+ days old.
3. **Contributions:** completed milestones assigned to you, at most 4 per project.
4. **Evidenced skills:** a declared skill counts only once real work backs it.
5. **Peer feedback:** teammates only. The author's account must be 14+ days old, only one feedback per author→subject pair counts, mutual 5-star pairs are halved, and fewer than 2 authors halves the signal.

Scores are computed on the server only. `recomputeRankings()` writes a `RankingRun` plus snapshots, protected by a transaction-scoped advisory lock. Rankings refresh lazily every 15 minutes, via cron (`/api/cron/rankings`), or from the admin page. Movement compares against the newest run that is at least 7 days old. Retention keeps every run from the last 48 hours, then one per day for 120 days. Users have no API for setting scores.

### AI service layer (`src/server/ai`)

* `config.ts`: model, effort, timeout, fallbacks and budgets, all from env vars.
* `types.ts` + `provider.ts`: an `AIProvider` interface (`generateStructured(schema)`) and a registry. Add a provider by implementing the interface and registering it there.
* `providers/anthropic.ts`: Claude through the official SDK. It uses `beta.messages.parse` with Zod structured outputs, so every response is schema-validated. It handles `refusal` and `max_tokens` stop reasons, maps typed SDK errors to friendly messages, and enables the server-side refusal fallback (`AI_FALLBACKS=off` disables it).
* `run.ts`: the single entry point. It checks configuration, then budget (6 requests/min burst plus rolling 24h request and token limits), runs the call with a timeout, and writes the usage ledger (`AIUsage`). A failure is never reported as success.
* `guard.ts`: prompt-injection defences. All user and profile text is wrapped in `<untrusted_*>` blocks with a data-only policy, look-alike delimiters are neutralised, and lengths are clipped. Outputs are post-filtered as well:
  * The matcher maps opaque handles (`C1…C6`) back to its own shortlist and drops anything invented.
  * Copilot edits are limited to an allow-list of fields with length limits, and are only applied after the user confirms. Authorization is re-checked at that point.
* **Privacy:** the model never sees names, emails, internal ids or private profiles. The matcher sends only member-visible fields for the shortlist, and the evaluator describes team members by role only.

---

## Setup

Prerequisites: Node 20+ and PostgreSQL 14+.

```bash
cp .env.example .env            # then edit DATABASE_URL (and ANTHROPIC_API_KEY for AI)
npm install
npx prisma migrate deploy       # or: npm run db:migrate (dev, creates new migrations)
npm run db:seed                 # skill taxonomy + demo data
npm run dev                     # http://localhost:3000
```

**Demo login:** `maya@demo.venturely.dev` / `venturely-demo-1`. Every demo account uses `@demo.venturely.dev` and is labelled "Demo" in the UI. Its links point to `example.com`/`example.org`. The seed also prints the moderator account (`admin@demo.venturely.dev`) with a random password unless `SEED_ADMIN_PASSWORD` is set. Re-running the seed replaces demo data only; real accounts are never touched.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | ✓ | PostgreSQL connection string |
| `APP_URL` | ✓ | Public base URL (reset links, metadata) |
| `ANTHROPIC_API_KEY` | for AI | Server-only key. Without it, AI pages show a configuration notice and the matcher falls back to skill-based results |
| `AI_MODEL` / `AI_EFFORT` | | Defaults `claude-opus-5-5` / `medium` |
| `AI_FALLBACKS` | | `default` (server-side refusal fallback) or `off` |
| `AI_TIMEOUT_MS`, `AI_DAILY_REQUEST_LIMIT`, `AI_DAILY_TOKEN_BUDGET` | | Timeout and per-user budgets (90s / 40 / 600k) |
| `RESEND_API_KEY`, `EMAIL_FROM` | for email | Password-reset email. In development without a key, links are printed to the server console |
| `CRON_SECRET` | for cron | Bearer secret for `/api/cron/rankings` |
| `SEED_DEMO`, `SEED_DEMO_PASSWORD`, `SEED_ADMIN_PASSWORD` | | Seed behaviour |
| `NEXT_PUBLIC_SHOW_DEMO_LOGIN` | | Shows the demo hint on the sign-in page |
| `TEST_DATABASE_URL` | tests | Separate database; its name must contain `test` |

### Commands

```bash
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm test              # Vitest: unit + integration (applies migrations to TEST_DATABASE_URL)
npm run test:e2e      # Playwright: starts/reuses the dev server on :3000
npm run build         # prisma generate + next build
npm run rankings:recompute
npm run db:reset      # drop, migrate and re-seed the dev database
```

---

## Deployment (e.g. Vercel + managed Postgres)

1. Provision Postgres (Neon, Supabase, RDS, …) and set `DATABASE_URL`, `APP_URL`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM` and `CRON_SECRET`.
2. Build command: `npx prisma migrate deploy && npm run build`.
3. Seed the taxonomy once: `SEED_DEMO=false npm run db:seed`. Only seed demo data on staging.
4. `vercel.json` schedules `/api/cron/rankings` every 15 minutes. Vercel sends `Authorization: Bearer $CRON_SECRET` automatically.
5. Leave `NEXT_PUBLIC_SHOW_DEMO_LOGIN` unset in production. Create a moderator by setting `role = 'ADMIN'` on a trusted account.

On any other Node host: `npm ci && npx prisma migrate deploy && npm run build && npm start`, plus a scheduler that calls the cron endpoint.

---

## Security & privacy summary

* Authentication and authorization are checked on the server for every protected page and mutation. Ownership checks return "not found" so they don't reveal that a record exists. Role checks cover project owner, admin and member.
* Input is validated with Zod on the server (and reused on the client). Control characters are stripped and lengths are bounded. Only `http(s)` links are accepted, and every rendered link goes through `safeExternalUrl` with `rel="noopener noreferrer nofollow ugc"`. AI Markdown is rendered with raw HTML disabled.
* Rate limits (in Postgres, so they work across instances) apply to sign-in, sign-up, password reset, invitations, applications, reports, avatar uploads and AI.
* Avatar uploads: 512 KB maximum, type detected from magic bytes (PNG/JPEG/WebP only). They're stored in the database and served with `nosniff` and a restrictive CSP, behind the same visibility checks as the profile.
* Security headers: `X-Frame-Options: DENY`, `nosniff`, a referrer policy and a permissions policy.
* Privacy by default: profiles are members-only by default, emails are never displayed, only a coarse region is collected (no birthdays, schools or locations), private profiles are excluded everywhere, blocks work in both directions, and AI history is private.
* Demo accounts cannot change their password or delete themselves; this is enforced on the server.

---

## Limitations & next steps

* **No API key in this build environment.** The AI tools are fully implemented and covered by tests with a fake provider (validation, budgets, injection guards, filtering invented candidates, edit authorization). The live Claude calls only run once `ANTHROPIC_API_KEY` is set.
* **Email** needs a Resend key in production; without it, reset links are only logged in development.
* **Legal & consent:** the privacy policy, terms and guidelines are templates and have not been reviewed by a lawyer. Before launch, add a region-appropriate parental-consent flow (e.g. for EU members under 16 where required, and the UK Children's Code), age-assurance as required, and a data-retention policy. The product does not claim legal compliance.
* **Verification** of achievements is manual (moderator review of evidence links). There are no integrations with competition organisers.
* **Real-time:** notifications and requests refresh on navigation. There's no websocket push.
* **Scale:** discovery scores up to 1,000 filtered candidates in memory, and rankings recompute all users in one pass. Both are fine for tens of thousands of users; move scoring into SQL or a background worker beyond that.
* Copilot replies aren't streamed. The UI shows an honest progress indicator during the 15–60 second wait.
