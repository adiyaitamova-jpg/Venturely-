# TEAMi

A platform where students find teammates, build real projects and keep a portfolio backed by evidence.

- **Profiles & portfolios** with honest skill levels, portfolio entries with links, achievements a moderator verifies.
- **Projects** with open roles, applications, invitations and milestones.
- **Leaderboard** computed only from evidence (verified achievements, shipped projects, completed milestones).
- **Chats & groups**, end-to-end encrypted in the browser, with messenger-style privacy settings
  (who can message me, who can add me to groups, read receipts, blocking).
- **AI Mentor**: teammate matching, project evaluation and a project copilot (Claude via the Anthropic API).
- **Three languages**: English, Russian, Kazakh.

## How it's built

| Part | Where |
|---|---|
| Front end (single page, React + htm, Tailwind) | `web/teami.src.html` → built into `public/app.html` + `public/app.js` |
| Browser runtime (data sync, sign-in, AI calls) | `public/teami-client.js` |
| API (Next.js route handlers) | `app/api/*` |
| Accounts & sessions (bcrypt, httpOnly cookie) | `lib/auth.ts` |
| Access rules for stored data | `lib/rules.ts` |
| Postgres (tables are created automatically) | `lib/db.ts` |

Members can only change their own documents; `data/users/<id>/…` (private keys, saved people, AI history) is readable only by its owner.
The account registered with `ADMIN_EMAIL` is the moderator.

## Deploy on Vercel (free Hobby plan) + Neon Postgres

1. Sign in to [vercel.com](https://vercel.com) with GitHub and **Import** this repository (framework: Next.js, no settings to change).
2. In the project, open **Storage → Create Database → Neon (Postgres)** and connect it to the project. This sets `DATABASE_URL`.
3. In **Settings → Environment Variables** add `ADMIN_EMAIL` (your email). Optionally add `ANTHROPIC_API_KEY` to turn on the AI Mentor (usage is billed to that key).
4. **Redeploy**. Open the site, create your account with the `ADMIN_EMAIL` address.

## Local development

```bash
npm install
cp .env.example .env.local   # set DATABASE_URL to a local Postgres
npm run dev                  # http://localhost:3000
```

After editing `web/teami.src.html`, rebuild the front end with `python3 web/build.py`.

## Environment variables

| Name | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `ADMIN_EMAIL` | yes | Email of the moderator account (comma-separated for several) |
| `ANTHROPIC_API_KEY` | no | Enables the AI Mentor |
| `AI_MODEL` | no | Claude model for the mentor (default `claude-opus-5-5`) |
| `AI_DAILY_LIMIT` | no | AI requests per member per day (default 40) |
