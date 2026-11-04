# Local application architecture

## Hosted deployment — 2026-11-02

See [hosting/admin](14-hosting-admin.md). Async `persistence.ts` selects local SQLite or pooled Postgres. Vercel requires DATABASE_URL and refuses local-file fallback. Hosted records are in a private RLS schema with a restricted server role, per-run/per-browser row locks, atomic receipts and shared request limits. Admin password-hash login issues expiring signed sessions; original game state and audited corrections remain separate. Hosted model evaluation stays unavailable pending a supported provider. The original SQLite interfaces and archived engines remain regression-tested.

## Current 0.9 model workflow

See [0.9 routing](13-v9-model-game.md). New `GET/POST /api/runs/:id/model` is owner-only and requires a finished 0.9 game. Settings are derived from accepted history; clients never supply temperature or scenario values. `model-jobs.ts` serialises the experimental local browser provider; `model-result.ts` validates its complete readback. SQLite `model_evaluations` caches the version/default-profile + 19-input scenario hash, status, result, error and update time. Uncached work is slow and not event-scale hosting. Run time stops at the final round, before evaluation. Public standings include only evaluated current-version records, ordered by displayed temperature then time. Pending games remain visible in admin; model temperatures cannot use old point-score overrides. Existing stores are migrated additively; archived engines and records are not reinterpreted.

## Current 0.8 arcade composition

`v8.ts` retains all 0.7 policy primitives/settlement, but dispatches new pure arcade simulations from `arcade.ts`. The second course is cleanup rather than pulse. Finish accepts bounded ordered flap frames or `{frame,lane}` changes, checks kind/round/attempt/elapsed time, replays deterministically and grants the existing capped resource reward. Original 0.6/0.7 saved attempts use the original replay code. No schema migration is required. The public course never consumes private policy seeds. `ArcadeGame` keeps physics/input in refs with a fixed-step RAF loop and lightweight HUD updates; `arcade-art.ts` handles client-only Canvas rendering. `/arcade` shares the component but makes no scoring/start requests. See 12 for controls and limitations.

## Current0.7 additions

Exact-version v7.ts dispatch preserves v6. Policy settlement is atomic, with canonical offer order, frozen pre-play quotes, budget cap and one revision. Public reference approval uses a difficulty8action; actual cards keep their own quotes. Cookie-backed browser passes are stored by hash, with a transactional two-start limit and request-idempotent starts using HMAC-derived recovery tokens. /api/attempts reports remaining starts; authenticated POST resets only the current browser. Clearing cookies/new browsers bypass this soft limit.

Admin authentication remains bearer organiser key held in client memory, not persistent browser storage. /api/admin returns paginated/searchable all-record metadata, or a redacted history by id. PATCH validates name/country/completed score0–1000/status and control revision. run_controls stores overrides/trash; original run JSON/scores and actions remain intact. admin_audit records corrections and removal/restoration. Deleted records are excluded publicly and player actions/reads return410. Legacy moderation also routes through audited revisioned controls. Display QR settings are stored server-side and editable only through /api/admin/display. The public display receives the join URL, not organiser data. No automatic record purges or attendee edits occur during tests.

Card images come from local per-card WebP files and a static attribution catalogue. API/CDN downloads happen only in the manual import script, never in player requests. Lazy loading avoids fetching the full shelf at first paint.

## Preserved0.6 dispatch and skill challenges

`engine.ts` dispatches exact version 0.6 to `v6.ts`, preserving the 0.5 engine. Policy packages use existing frozen quotes and transaction validation, then settle the round atomically with one revision. `v6.ts` adds three rare definitions and server-only consequence selection. Accepted rare categories count toward family bonuses. Public catalog data exposes the type of risk, not its numerical outcome in advance.

The action endpoint accepts exactly one of cardId, cardIds or a typed special command. Begin locks the reward and stores its server timestamp; finish accepts bounded, ordered input frames and an end frame, never a claimed score. `challenges.ts` replays a fixed 60Hz public course or timing function to derive a bounded result. The server rejects premature, malformed, duplicate and wrong-round claims. Revision/idempotency and ownership apply to every challenge action. Course data is unrelated to the secret policy/offer seed. This prevents arbitrary reward injection; it does not prove a human played or stop optimised scripts.

`GameV6` supplies the active phone UI, while the old component continues saved sessions. `SpecialRound` renders a light canvas loop with fixed-step physics and keyboard/touch inputs. Photos and flags are local, credits have a dedicated route, sounds are synthesized without downloads, and the country picker loads flags lazily. No schema migration or new runtime dependency was needed. See 10 for exact rules and pending limitations.

## Preserved 0.5 planning-session dispatch

`engine.ts` dispatches exact-version `prototype-0.5` to `v5.ts`; 0.4 and earlier routes stay frozen. `config.ts` supplies `PLANNING_YEAR=2026` and `PLANNING_ROUNDS=10`. `V5_CARDS` copies 48 cards with minimum-round gates removed but prerequisites retained. New-game public responses expose planning year, total rounds, attempts this round, end-round availability and skip bonus, with no display-year array. JSON state requires no database schema migration.

The action API accepts exactly one of `cardId` or unique `cardIds[1..3]`, plus revision/idempotency key. Batch play is allowed only for 0.5. Existing `BEGIN IMMEDIATE` transactions preserve ownership, original-response idempotency and optimistic revision protection. Invalid, locked, duplicated, unoffered or jointly unaffordable packages fail atomically. Client scores/effects/quotes are not trusted.

Batch quotes use one pre-play state and server offer order, preventing selection-order advantage or borrowing future refunds. Each attempted card records `kind: policy`, year 2026 and planning-round number. One batch increments revision once without advancing round; unselected offers remain. `kind: round-end` records maintenance/allocation and advances round. Neither cards nor reshuffles award allocation or reset reshuffle prices. Only explicit round end resets the price counter.

`v5Public` removes the secret seed and builds `climateScenario` from accepted policy IDs only, excluding round-end/save markers. `climate-levers.ts` contains sourced control metadata and designer targets, not executable model code or temperature arithmetic. Offers/Library expose inputs and caveats. `model.ts` uses an illustrative 150-point target for 0.5 with an empty trajectory; no2026–2100 forecast is fabricated. The client submits selected IDs and displays receipts without computing authoritative outcomes. New-game board uses a planning counter; old runs retain dated single-card behavior.

## Historical 0.4 dispatch

`engine.ts` dispatches exact-version 0.4 calls to `v4.ts` and preserves all earlier formulas/card pools. `v4-cards.ts` contains 48 cards/10 pathways; `types.ts` adds optional public metadata (years/totalRounds, paid-redraw cost, library with eligibility reasons, all combo recipes, active synergies, score breakdown, resilience and upkeep). `config.ts` keeps LEGACY_YEARS and 14 new YEARS; version-aware helpers avoid changing saved runs. `projectFor` uses a 180-point game target only for 0.4. `errors.ts` avoids a circular import between engines.

The public catalog describes every card and all 11 combination recipes, but does not grant permission to play a locked/unoffered card. The server rechecks prerequisites, year, prior success, offer ownership and affordability on every commitment. Paid reshuffles use the existing action transaction/revision/idempotency boundary, spend credits, increment per-turn and lifetime counts, and do not advance time. Per-turn cost resets only after a decision. Family bonuses count distinct accepted IDs, so repeatable recovery cannot farm them. The engine caches accepted IDs by state/history identity and length; engine history is append-only.

Client Library is a native-dialog panel with path/search filters and expandable card details/recipes. The timeline groups 14 steps into 7 compact pairs. No database/schema migration or client-computed authoritative score was introduced.

## Earlier architecture notes

The 0.3 revision freezes both 0.1 and 0.2 rule sets explicitly. `cardsFor`/`cardFor` choose the correct pool; `strategicRules` gates new formulas, buffs, costs and scoring. Successful ownership, phase and prerequisites are validated again at commitment as well as when offering. Public offers include exact rejection refund/support loss and political effort. The client does not calculate or submit authoritative scores. `src/game/art.ts` holds cosmetic atlas coordinates, not effects. Phone hand focus is UI-only and does not mutate the run.

A single Next.js TypeScript app serves mobile players, the display screen and server APIs. React manages the interface, Motion animates cards, and Node's SQLite driver persists runs locally. There is no separate game engine, Rust service, background queue, websocket server or SSH access for attendees.

## Data flow

```text
Phone browser                  Display browser
      |                              |
      | start / action or package    | poll standings every 5 seconds
      v                              v
Next.js API routes and input validation
      |
      +--> Server-owned game engine --> Climate adapter
      |                                  (illustrative now)
      v
SQLite transactions in data/game.sqlite
      |
      +--> Saved runs, action receipts, scores, moderation flags

Organiser browser --> authenticated moderation API --> hide or restore
```

## Boundaries

| Module | Responsibility |
| --- | --- |
| `src/game/types.ts` | Shared state, cards, decisions, projections and public contracts |
| `src/game/config.ts` | Versioned dates/planning rounds, initial resources and rules version |
| `src/game/cards.ts` | Data-driven policies, effects, phases and prerequisites |
| `src/game/perks.ts` | Six family perks, legacy guards and shared decade events |
| `src/game/random.ts` | Reproducible per-run random draws |
| `src/game/engine.ts` | Pure turn logic, offers, approvals and scores |
| `src/game/v5.ts` | Same-year multi-card play, explicit round endings and current scoring |
| `src/game/climate-levers.ts` | Verified input vocabulary, proposed targets and overlap handling; not a simulator |
| `src/game/model.ts` | Replaceable climate projection interface with provenance |
| `src/server/store.ts` | Local SQLite persistence and transactions |
| `src/server/http.ts` | JSON validation, ownership/admin helpers, errors and basic rate limits |
| `src/app/api/` | Thin API endpoints |
| `src/components/` | Join, game, results, board and organiser views |

## Consistency and security

The server creates a cryptographic seed and separate random recovery token. Only the token hash is stored; seeds never enter public responses. Players submit offered card IDs, current revision and idempotency key, never authoritative scores/effects. The engine checks eligibility and total package affordability. SQLite `BEGIN IMMEDIATE` transactions protect updates; each idempotency key retains its original response. A stale revision returns a conflict without spending another action.

The redraw action uses the same endpoint and transaction but increments revision without advancing round. Clients must not equate revision with round. Public offers include effective cost, approval, transition gain and named bonuses so the UI does not recalculate authoritative outcomes. Public rankings filter on the active rules version; organiser views retain all versions. Legacy runs explicitly disable new perks/events/redraw rather than receiving them implicitly.

The legacy 32-card pool and classifications remain available in `LEGACY_CARDS`. Version 0.1 runs use that pool for both offers and action validation; new cards and reclassified families do not silently enter a resumed old run.

Client action identifiers use `crypto.getRandomValues` so phone testing can work over plain HTTP on a private LAN. `crypto.randomUUID` is unavailable on those insecure origins; it is not used in player actions.

The local SQLite database uses a busy timeout and version-aware journaling. Patched SQLite releases use WAL; older bundled releases use rollback journaling to avoid the documented WAL-reset race. Parameters are bound rather than concatenated into SQL. Private organiser requests require a bearer key; public JSON mutations reject cross-origin browser requests against the actual Host header. Nicknames have length and character validation and render as text. CSV fields are escaped and guarded against formula injection. Moderation hides rather than deletes results.

The installed Node 22.20 bundles SQLite 3.50.4, so it uses rollback journaling. [SQLite documents the fix in 3.51.3 and backports 3.50.7 and 3.44.6](https://sqlite.org/wal.html). The application chooses WAL only for those patched versions or newer mainline releases. Do not force WAL on an older runtime.

Limits are intentionally local-prototype level. Rate limiting is per process, start limits use the forwarded IP header without a trusted-proxy policy, there is no robust device identity, and a browser can create another run. Anonymity, anti-cheat and retention policy need event review. Do not promise one device can play only once.

## Performance and deployment

Visuals and the game UI run in each attendee's browser. Server work is one lightweight transaction per decision, not continuous minigame traffic or a runtime climate simulation. Only shared display pages poll the board; hidden tabs pause polling. Forty-player API testing measures the local prototype, not venue Wi-Fi or public-hosting capacity.

The app is structured for a later web deployment, but local SQLite is not a suitable durable store for ordinary Vercel serverless instances. Replace the storage adapter with a hosted relational database before that deployment. Also replace process-local rate limiting, set a private organiser key, introduce event/challenge scoping, and validate simulator computation separately. Node 22.13+ is required; Node 22 marks its built-in SQLite API experimental.

[Next.js route handlers](https://nextjs.org/docs/app/getting-started/route-handlers) define the server boundary. [Node SQLite documentation](https://nodejs.org/api/sqlite.html) covers the driver. The generated Next.js agent rules require reading relevant bundled guides before framework edits.

Framework configuration uses `next.config.mjs` with JSDoc types. This avoids a Windows native TypeScript-config canonicalisation failure during production startup in this restricted workspace; application source remains TypeScript.
