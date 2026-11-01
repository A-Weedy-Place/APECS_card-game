# Local operation and verification

## GitHub handoff — 2026-11-01

User authorised Git initialisation and pushing this project to `A-Weedy-Place/APECS_card-game`. Include source, tests, scripts, context and attributed assets. Exclude environment secrets, SQLite/player/admin records, dependencies, build output, screenshots/traces and local machine credentials. Authentication uses the existing GitHub CLI/keyring; no credential is copied into the project. This source handoff is not a deployment. Before Vercel, replace local SQLite with durable hosted storage and replace the installed-Edge/persistent-process model worker with a supported licensed provider and suitable job architecture. Production must use a private ADMIN_TOKEN; the local development fallback is not a production key.

## Current0.9

Read13-v9-model-game.md for the current model/card contracts. Development enables the experimental local Edge/Playwright public-simulator bridge unless ENROADS_BROWSER_ENABLED=0. Production disables it unless explicitly enabled with1; this is for local testing, not Vercel/event readiness. Finish a **new** game, then Calculate temperature. Pending/failed outputs never rank. Official simulator network access is required; the game itself remains local. Identical scenario packages use a persistent versioned cache; one browser evaluation at a time. No SDK has been acquired yet.

`node scripts/verify-model-runtime.mjs` is an opt-in live network test on3002 with its own fresh database. Regular browser tests use3001/fresh database and disable live model calls; display fixtures are not saved.0.8 UI test reference is archived as `tests/e2e/archive-game-v8.reference.ts`; all legacy engine regression suites remain active. Preview3000 must remain running. Saved games do not migrate: start fresh to see0.9; organiser Reset my plays restores only the current browser's two-start testing allowance without deleting records.

Current 0.8 composes the 0.7 policy economy below with new Flappy Flight / Reef Rescue courses. Start a fresh game for them, or visit `http://127.0.0.1:3000/arcade` for unlimited practice without spending a browser play or earning resources. Saved 0.7 games keep their challenges. Current browser tests include practice controls/pause, phone reward replay and the isolated 40-player scenario. Older version-specific measurements below are historical; final 0.8 evidence is in Progress.

## Run the prototype

Node 22.13 or newer is required. Install dependencies with `npm install`, then run `npm run dev`. The server binds to `127.0.0.1:3000` by default and saves data in `data/game.sqlite`. Leave the terminal session running.

| URL | Use |
| --- | --- |
| `http://127.0.0.1:3000` | Briefing and start |
| `http://127.0.0.1:3000/play` | Resume the game saved in the current browser |
| `http://127.0.0.1:3000/leaderboard` | Shared screen with QR code and standings |
| `http://127.0.0.1:3000/admin` | Organiser dashboard |
| `http://127.0.0.1:3000/about` | Rules and limitations |
| `http://127.0.0.1:3000/credits` | Photograph sources and asset licences |
| `http://127.0.0.1:3000/arcade` | Unlimited practice of both new minigames, without records or rewards |

Development organiser key: `polar-local` only when `ADMIN_TOKEN` is unset. A production server has no default organiser key. Set your own key through `.env.local` or the process environment. `.env.example` is a template, not a secret. Do not commit secrets or the data directory.

## Phones and venue networking

Localhost on a phone points to the phone, not the laptop. Before phone testing, set a private `ADMIN_TOKEN`, start `npm run dev:lan`, allow only the necessary private-network firewall access, and put the laptop's reachable LAN URL into the authenticated admin QR settings. Players and laptop must share a network that allows device-to-device communication. Venue Wi-Fi may block it. No SSH, APK or attendee access to the laptop's shell is required.

The LAN script refuses to start without a non-default organiser key. Default loopback operation needs no configuration. A virtual environment is not a network isolation boundary; do not expose database or admin ports directly. Public hosting needs a durable hosted store and security review, not a tunnel workaround assumed safe.

## Tests

- `npm test`: rules, 1000 simulated runs, ownership, revisions, idempotency and moderation in separate test databases.
- `npm run typecheck`: TypeScript checks.
- `npm run build`: production compile.
- `npm run test:e2e`: after building, phone gameplay, resume, results, moderation, responsive layouts and 40 concurrent API players on production port 3001 with an isolated database.

Install the test browser once using `PLAYWRIGHT_BROWSERS_PATH=./.playwright` and `npm exec playwright -- install chromium`; PowerShell syntax is in the root README. Browser screenshots go into `screenshots/`, traces into `test-results/`; both are ignored. Tests create uniquely named SQLite files under `data/`, leaving attendee data untouched.

If the bundled browser download is unavailable on Windows, set `PLAYWRIGHT_CHANNEL=msedge` to test with an installed Microsoft Edge instead. This does not modify the user's Edge profile; Playwright launches an isolated headless profile.

The display polls every five seconds and retains scores during a temporary connection failure. A lost phone connection shows a retry message. Refresh reloads the last committed turn using the browser's recovery key. Clearing site storage loses that key but does not delete the stored run.

Use the isolated `npm run test:e2e` 40-player scenario for current 0.8 concurrency checks. It exercises one multi-card package per ordinary round, special-round skips, idempotency and tampering checks on port 3001 with a fresh database. The phone scenario also plays both arcade courses and compares the cleanup claim with deterministic replay. Separate practice scenarios cover responsive canvases, pause and controls. Other scenarios cover two-start quotas, admin correction/trash/restore, reduced motion, keyboard and country-popover fallback. `scripts/smoke-load.mjs` is an older seven-turn tool targeting the preview by default; it has not been migrated to 0.8 and must not be used for current verification or against attendee data.

Next.js is pinned to 16.4.3 as of 2026-10-27. The compatible patch resolved the security reminder that interrupted earlier 16.4.0 startup/build processes. The post-install dependency audit reported zero vulnerabilities; this is a point-in-time dependency check, not an application security guarantee. Start a new game from home for 0.8, or use `/arcade` for immediate no-reward practice; an existing saved run intentionally keeps its older rules/challenges.

Two started games are counted per HttpOnly browser-pass cookie, including unfinished starts. An idempotent retry does not spend another play. Clearing cookies or using another browser bypasses this soft limit; it is not physical device identification or prize-ready anti-cheat. The authenticated admin's **Reset my plays** resets only the current browser pass for testing and records an audit entry. It does not delete saved games or reset every attendee.

All 51 card photographs are served locally from `public/art/cards/`. Source/licence metadata is in `credits.json` and `/credits`; each file also has a licence sidecar. `node scripts/acquire-card-photos.mjs` retains cached assets by default. The Commons website hostname failed DNS in this environment, but the official English Wikipedia Action API resolves shared Commons image metadata, and Wikimedia upload/thumbnail CDNs worked. The importer uses identified, paced requests with retry/backoff. This required no system DNS changes. Photo review and licence corrections are recorded in artwork provenance.

## Moderation and retention

The authenticated organiser can search all records (including unfinished, older and trashed runs), inspect history, correct name/country and completed score, hide/restore rankings, export the current page safely to CSV, and recoverably trash/restore records. Changes use optimistic control revisions and an audit log; original game state and calculated scores are preserved. Trashed runs disappear from rankings and return 410 to their owners until restored. Admin credentials stay in memory after login; no public player/display links expose the key. Production has no default key, but production authentication/session/rate-limit review is still required.

Recoverable trash is not a permanent personal-data erasure mechanism. Agree retention and permanent deletion with the event team; provide a named contact before public use. Back up the SQLite database through a proper SQLite backup operation or with the app stopped, rather than copying only the main file while WAL writes are active. Do not change preview attendee records to test moderation; use the isolated test database.
