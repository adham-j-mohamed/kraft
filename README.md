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
- Username and password. No third-party sign-in. Anyone can request an account
  at `/register`, but it can't log in until an admin approves it: admins see a bell
  with the number of pending requests on every page and approve or reject under
  Admin → Users. The first account created becomes the admin and is approved
  immediately. Admins can also create ready-made accounts directly.
- Registration is rate-limited per IP address (5 per hour), capped at 50 pending
  requests, and has a hidden honeypot field against simple bots.
- English and Swedish. The language follows the device (`Accept-Language`) until
  the user picks one in the language menu at the top of every page.
- Passwords are hashed with scrypt from Node's standard library (no native
  dependency), and changing a password invalidates older sessions.
- All data lives in Postgres on your own server, per account, and never only in
  the phone's storage.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Drizzle ORM ·
Postgres 17 · `@zxing/browser` for barcode decoding · scrypt password hashing and
signed session cookies (`jose`).

There is no auth framework in the dependency tree: login, registration, password
changes and admin account management are a small, explicit implementation in
`src/lib/auth`.

## Run locally

```bash
cp .env.example .env      # fill in DATABASE_URL and AUTH_SECRET
npm install
npm run db:generate       # only when the schema changed
npm run db:migrate
npm run db:seed
npm run dev
```

The app listens on <http://localhost:3310>. The first visit goes to `/register`;
the account you create there becomes the admin and is approved immediately. Later
registrations wait for an admin to approve them under Admin → Users.

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

## Accounts

The first account is created at `/register` and becomes the admin. After that,
`/register` stays open: a new request is stored with status `pending` and cannot
log in until an admin approves it under Admin → Users (a bell icon with a counter
shows pending requests). Rejecting a request deletes it, which frees the username.
Admins can also create accounts directly there with an initial password. Members
can change their own password under Settings.

Usernames are 3–32 characters, lowercase letters, digits, `.`, `-` or `_`. Passwords
are at least 8 characters. Five failed logins per username and IP address block
that combination for 15 minutes.

## Data and privacy

Health and nutrition data is personal. Accounts are isolated by `user_id` on
every query, there is no open registration, and the database binds to loopback
only. There is no analytics, no third-party script and no tracking.

## Status

Early. Training and food logging are being built in this order: schema and
auth (done) → training → food → barcode → offline and PWA polish.

## License

MIT — see `LICENSE`.
