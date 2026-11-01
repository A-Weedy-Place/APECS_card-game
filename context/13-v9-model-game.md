# 0.9 model game — 2026-10-31

| Need | Code |
| --- | --- |
| 19 main controls, baseline, range, units, guide | `src/game/enroads-controls.json` |
| 67 cards, prerequisites, full-package assembly | `src/game/policy-catalogue.ts`, `v9.ts` |
| Upright phone hand, three-resource HUD, result | `src/components/game-v9.tsx`, `src/app/policy-game.css` |
| Experimental public browser adapter | `scripts/enroads-browser.mjs` |
| Validation, persistent cache, serial queue | `src/server/model-result.ts`, `model-jobs.ts`, `store.ts` |
| Temperature-first, time-second ordering | `src/game/ranking.ts` |

## Rules

New 0.9 starts, preserved0.8/earlier engines/components. Ten planning rounds adopt policies in 2026. Special4/7 keep0.8 arcade. Later user request for one selection opportunity/round supersedes0.5's open-ended drafting: select up to3 affordable offered cards, Play resolves frozen quotes and settles the round once. Skip only ordinary income. Shuffle costs1,2,3… until round settlement. No owned deck.

Three resources: Revenue growth (game income, not model GDP); Politics (dominant approval effect); Public engagement (smaller approval boost and effort reduction at 60+). Fair/inclusive participation is represented here without defining justice as awareness. Legacy justice field remains0 for compatibility. Start 8 coins/cap 20, income clamp(3+floor(revenue/25),1,8), purse-clipped, none on final round. Politics decay4 (+3 if revenue<25), engagement decay2/round. Approval clamp(round(40+.6*politics+.12*engagement-difficulty-2.6*round),5,95); enablers100%. All numerical social/economic rules are designer assumptions.

18-coin election mandate requires coalition; can fail (25% refund/-15 politics), success gives future96–99% approvals, no direct climate change. Normal rejection refunds half/-4 politics. Package effects never retroactively improve frozen odds. 58 factor cards +9 enablers. Accepted factors use last adopted absolute target, not addition; no2 same-factor cards/package. Upgrades require accepted prerequisite and its active target. Population and GDP are scenario assumptions, not guaranteed/coercive demographic outcomes. Revenue does not automatically change either. Physical implementation follows pinned model defaults/later response, not round number. Adaptation/justice/politics have no automatic cooling.

## Experimental local model provider

User has no SDK yet and is contacting Climate Interactive. User explicitly authorised experimenting with entering decisions in the public tool at runtime. Not a licensed SDK, supported API, vendor-approved unattended use, or event-ready hosting. No private endpoint/model code copied. Verify terms/SDK rights for production. No organisation contacted. Attribution: Climate Interactive/MIT Sloan; guide CC BY4.0. [Official use/licensing guidance](https://support.climateinteractive.org/support/solutions/articles/47001266571-how-to-use-and-cite-en-roads-and-c-roads).

Isolated headless Edge/Playwright loads official26.10.0, checks all 19 defaults/ranges, changes visible slider handles using keyboard, reloads UI-generated scenario URL, verifies all 19 final values and reads settled displayed2100 °C. No player identity sent. Any mismatch/version/default drift/timeout fails closed. Public UI is fragile/slower than SDK. Enabled in development; explicit ENROADS_BROWSER_ENABLED=1 required in production. Hosted/serverless cannot assume installed Edge or persistent worker.

Owner-authenticated finished0.9-only POST `/api/runs/:id/model` queues; GET polls. Server derives settings from accepted history. One browser job/process, max10 distinct queued packages, identical packages share SQLite result. Cache SHA256 includes all 19 settings and pinned version/default profile. Validation requires complete matching readback, precision, official URL/version, timestamp. Server stops play clock before calculation. New leaderboard excludes pending, failed, hidden, trashed and archived versions. Lower displayed0.1°C first; ties use elapsed centiseconds; exact displayed ties share rank. Finish time/ID gives stable order. No points or hidden extra precision. Admin can relabel/moderate but cannot overwrite model temperatures via score corrections. `runs.score` remains null for 0.9.

Future licensed SDK should implement a provider contract with independently verified inputs/timing, new provider/profile and regression agreement. Current browser cache is not a scientific validation dataset.

## Verification

Final handoff: 104 unit tests and all7 browser tests passed, including all67 cards' internal photo/text bounds at320px. Typecheck/build passed. Latest40-player/400-round local p95 927ms/max1151ms excludes model work. Final actual server smoke repeated baseline+3.3°C in34.389s with cache/time/leaderboard/no-demo-pressure checks. Preview3000 returns200. See Progress for remaining production/licence/science/physical-device checks. Queue reconnect is implemented but restart fault injection remains untested. Historical measurements below remain recorded as earlier runs.

Live 26.10.0 (updated2026-10-14), baseline display+3.3°C.2026-10-31 adapter tests: mixed coal75/newzero1/nature25 round-tripped all 19 and returned+3.0°C; all 19 changed extreme test round-tripped and returned+1.7°C. These are test scenarios, not claims that gameplay budget can achieve them. Other verified checks go in Progress. SDK/event automation permission, physical iPhone and event-scale latency remain pending.

The actual server endpoint/queue/provider/cache/result/leaderboard flow also passed on isolated3002/database: baseline+3.3°C,34.366s uncached, time unchanged, cached retry. 104 unit tests, typecheck/build and6 browser tests passed; local40-player400-round p95=845ms/max935ms excludes model jobs. A queued wait is allowed the full ten-job deadline; running jobs time out separately. Result-page reload reconnects an existing unfinished local job. Further final small-screen content-bounds verification is recorded in Progress.
