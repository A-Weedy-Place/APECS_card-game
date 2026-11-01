# COP31 Cryosphere Pavilion game

A local APECS engagement prototype with ten 2026 planning rounds,67 distinct-photo cards, progressive paths across all 19 En-ROADS controls and three resources: Revenue growth, Politics and Public engagement. Two optional arcade games remain: Flappy Flight and Reef Rescue. New 0.9 results rank by lower displayed2100 temperature, then shorter play time.

Select up to three affordable offered cards and commit once per ordinary round. Start 8 coins/cap 20, with Play/Shuffle/Skip. A browser pass allows two starts; organiser tools reset it for testing without deleting games. Start fresh for 0.9; older saves retain original rules. [Current 0.9 architecture and limitations](context/13-v9-model-game.md). [Practice both games](http://127.0.0.1:3000/arcade) without using a play or earning rewards.

An **experimental local browser bridge** enters complete anonymous scenarios into the official public En-ROADS26.10.0 UI, verifies all 19 values and reads displayed temperature. Finish a new game and press Calculate temperature. No invented temperature is substituted on failure. Not an SDK, supported API or event-ready hosting solution; SDK access/terms are being arranged. It requires network access and installed Edge/Playwright, takes tens of seconds uncached, serialises jobs and caches identical packages. Development enables it by default; set ENROADS_BROWSER_ENABLED=0 to disable. Production requires explicit1 for local experiments. Do not assume it works on Vercel.

## Start

Requires Node 22.13+.

```powershell
npm install
npm run dev
```

Open [the game](http://127.0.0.1:3000), [the display board](http://127.0.0.1:3000/leaderboard) or [organiser tools](http://127.0.0.1:3000/admin). The local development organiser key is `polar-local` unless `ADMIN_TOKEN` is set. Scores persist in `data/game.sqlite`, which is ignored by Git.

For phone testing, choose a private organiser key first:

```powershell
$env:ADMIN_TOKEN = 'your-long-private-organiser-key'
npm run dev:lan
```

In Admin, set the display QR join address to the laptop's reachable LAN URL. Localhost does not work from other devices. Venue network and firewall configuration are not changed automatically.

## Verify

```powershell
npm test
npm run typecheck
npm run build
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.playwright'
npm exec playwright -- install chromium
npm run test:e2e
```

Browser tests require a completed build, start an isolated production server on port 3001 and use separate databases. The user preview remains on port 3000. Production operation uses `npm run build` then `npm start`; set `ADMIN_TOKEN` to enable organiser access outside development.

On Windows with Microsoft Edge installed, `$env:PLAYWRIGHT_CHANNEL = 'msedge'` before `npm run test:e2e` avoids downloading a test browser.

## Project map

[Context index](context/README.md) routes future work to the relevant notes. [Game rules](context/02-game.md) explain all current balancing values. [Architecture](context/03-architecture.md) describes server ownership, persistence and concurrency. [Model integration](context/04-models.md) lists requirements for honest climate output. [Next work](context/07-next.md) orders playtesting, science and deployment preparation.

The frontend uses React, TypeScript, Motion, Lucide and QRCodeSVG. Next.js serves the UI/APIs; Node SQLite provides local persistence. Artwork and flags are local. Playing needs no external account; the optional experimental temperature calculation needs the official public simulator online. `node scripts/verify-model-runtime.mjs` runs a live smoke test using its own port3002/database, never attendee records.

Original artwork and prompts are in [art provenance](public/art/PROVENANCE.md): a polar background and two atlases with 24 scenes. Version 0.5 keeps current rankings separate; saved 0.4 games retain fourteen dated decisions and 0.1–0.3 retain seven. Start from the home form for new rules. `npx tsx scripts/balance-report.ts --samples=100` now probes multiple plays and explicit round endings on shared seeds without changing the database. Current evidence is recorded in [Progress](context/06-progress.md) and is not a substitute for human playtesting. [Research/debate](context/08-mechanics-research.md) records game references; [En-ROADS mapping](context/09-enroads-mapping.md) documents 17 controls, timing and SDK access.

## Before an event

Obtain supported SDK/API access and confirm project-specific terms before an event. Independently review mappings/timing and compare complete scenarios. The public-UI prototype is fragile, serial and not a high-concurrency production backend. Targets, costs, approval odds and social effects remain designer assumptions even when the physical scenario is evaluated by En-ROADS. Adoption2026 does not imply instant implementation. Justice/adaptation do not automatically lower temperature. Prize fairness, privacy, retention, human balance and physical iPhone/Safari testing remain pending. Hosted deployment needs durable storage, proper workers, stronger authentication/rate limits and venue rehearsal. Archived game indices never become climate predictions.
