# Kraft

A self-hosted workout and food tracker that installs as an app on iPhone. One
place for rotating workout programs, set-by-set progress against your last
session, a food diary with barcode scanning, and calorie and macro goals.

Built as a PWA: no App Store, no native build. Add it to the home screen from
Safari and it runs full screen with the camera available.

## What it does

**Training**
- Programs with any number of workouts that rotate (A/B/C, push/pull/legs, ...).
  The app suggests the next one; you can always pick another.
- Exercises with sets, reps, weight, time or distance, RPE, supersets, drop sets
  and rest timers.
- While you train, every exercise shows what you did last time: the sets, the
  best set and estimated 1RM, so progress is visible without remembering.
- History and trends per exercise.

**Food**
- Diary per day and meal, calories and macros, target computed from body data
  (Mifflin-St Jeor plus activity level) or set manually.
- Barcode scanning with the camera. Product data comes from Open Food Facts,
  cached locally so repeat scans are instant and work offline.
- Own foods, favorites, meal templates, water, weight with trend, streaks and a
  weekly view.

**Accounts**
- Google sign-in only. No passwords. New accounts need an invitation; the first
  account created becomes the admin.
- All data lives in Postgres on your own server, per account, and never only in
  the phone's storage.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Drizzle ORM ·
Postgres 17 · `@zxing/browser` for barcode decoding · Google OAuth with signed
session cookies (`jose`).

There is no beta auth framework in the dependency tree: the Google flow is a
small, explicit OAuth 2.0 + PKCE implementation in `src/lib/auth`.

## Run locally

```bash
cp .env.example .env      # fill in DATABASE_URL, AUTH_SECRET, Google keys
npm install
npm run db:generate       # only when the schema changed
npm run db:migrate
npm run db:seed
npm run dev
```

The app listens on <http://localhost:3310>. Without Google credentials you can
set `ALLOW_DEV_LOGIN=1` and use `/api/auth/dev` — never on a public host.

## Deploy

Everything runs in Docker on one host: `db`, `app`, and a one-off `tools` image
for migrations and seeding.

```bash
./scripts/deploy.sh                                  # rsync to the server
ssh aj-lab 'cd ~/kraft && docker compose up -d db'
ssh aj-lab 'cd ~/kraft && docker compose run --rm tools'
ssh aj-lab 'cd ~/kraft && docker compose run --rm --entrypoint node tools scripts/seed.mjs'
ssh aj-lab 'cd ~/kraft && docker compose up -d --build app'
```

The public hostname is served through an existing Cloudflare tunnel; the app
itself only needs a hostname rule pointing at `http://<host>:3310`.

## Google OAuth

Create an OAuth client of type *Web application* and add both redirect URIs:

- `https://<your-domain>/api/auth/callback/google`
- `http://localhost:3310/api/auth/callback/google`

`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` go in `.env` on the server. While
the consent screen is in *Testing*, only listed test users can sign in.

## Data and privacy

Health and nutrition data is personal. Accounts are isolated by `user_id` on
every query, invitations are explicit, and the database binds to loopback only.
There is no analytics, no third-party script and no tracking.

## Status

Early. Training and food logging are being built in this order: schema and
auth (done) → training → food → barcode → offline and PWA polish.

## License

MIT — see `LICENSE`.
