# Vercel and hosted records

## Requested 2026-11-02

Deploy to the user's Vercel account. Use their requested password as a server-only salted scrypt hash, never a committed plaintext password. Admin signs in for an eight-hour signed session kept only in memory. Shared login throttles limit guesses. Preserve local preview and existing SQLite records. No automatic data upload from the laptop.

User explicitly chose a **different Supabase account** from the connected neodym organisation. Do not change neodym recruit or create resources there. Separate CLI login completed and user approved creating the free organisation **APECS COP31** (`nkxccagazrewcxdfyraw`). Its new project is **apecs-card-game** (`shdiharlumvykiaeaddt`), Frankfurt. Vercel65.9.0 login completed as `asharmehmood99-4970` (Hobby); checkout linked to its `apecs-card-game` project. Do not create paid resources or upgrade plans without explicit cost approval.

## Implementation

2026-11-08: admin table rows show browser starts used and a direct reset action. The reset restores the linked browser’s allowance to two and may affect other games on the same browser. Legacy unlinked rows have no tracked allowance. The editor accepts name, country, a legacy game-point correction, or a manual position from 1 to 10 for a verified 0.11/0.12 result. Manual placements appear as such on the board. Empty position restores automatic temperature/time order. Competing positions use the normal result order as a tie-breaker. The model result remains authoritative.

The confirmed DELETE endpoint erases the selected game, its controls, actions and audit. It leaves an unlinked browser request receipt to reject stale retries. Deletion does not spend or reset plays. Old trash rows can be deleted individually. The hosted migration grants DELETE on the private runs table only. Foreign keys cascade record cleanup and clear the request receipt’s run ID. SQLite performs equivalent changes in a write transaction. No model scenario cache is tied to a player identity. Hosted migration was applied to the linked APECS project and database advisors reported no warnings.

2026-11-05: names are now reserved at registration and admin rename (see `player-name.ts`). Hosted checks use `pg_advisory_xact_lock` with a signed64-bit hash of the normalized name, inside the existing transaction, before querying original/current names. This is transaction-scoped and compatible with the existing pooler; no DDL, new grants, exposed schema or browser keys. Original/trashed identities remain reserved and pre-existing duplicates are preserved. Verified against the actual restricted hosted role: three simultaneous case/space-equivalent starts produced one success and two409 conflicts; idempotent retry, optional empty country and admin collision rejection also passed. Generated diagnostic rows were identity-checked and cleaned; no attendee records modified.

API calls use async `persistence.ts`. No DATABASE_URL selects the existing SQLite adapter; Vercel refuses to use ephemeral SQLite. `postgres-store.ts` uses a small node-postgres pool and unnamed statements through Supabase's transaction pooler. Short transactions lock one browser allowance for starts and one run for actions/corrections. Idempotent actions, versioned original state, ownership, revisions and validated model-only ranking remain authoritative.

Migration creates private `apecs` tables, RLS and a dedicated `apecs_server` login with only select/insert/update. No schema exposure or browser Supabase keys. Set the runtime role password outside migrations. Use TLS verification; do not disable certificate checks. Migration needs a privileged one-time connection; runtime must use the restricted role. Player photos/minigames remain browser-side.

Admin can inspect history, new action timestamps, related games from the same browser, allowance usage and audit corrections; restore another browser's two starts; edit public identity; hide/trash/restore records; export all paginated records and configure display QR. Browser linkage is a bypassable cookie, not an account/person/device identity. Old action timestamps remain unknown. Originals stay intact and temperatures cannot be corrected as points.

Updated2026-11-03: hosted En-ROADS requests use a private durable queue and an outbound-only laptop worker; read15-v10-experience-worker.md. The Edge/public-UI bridge runs on the laptop, not Vercel. Only matching genuine outputs rank; unavailable/failed jobs remain pending. SDK/licence and event-scale model service remain outstanding.

## Verification

Verified107 unit tests, typecheck/build and7 isolated Edge browser tests including new password/reset/activity/export flow. Actual local Postgres integration passed concurrent start quota, duplicate actions, revision races, original-record preservation, restricted-role permissions, nine RLS tables, no pending rankings and30 players/300 actions (latest p95 261ms/max305ms; direct DB). Local SQLite HTTP40-player test p95 1694ms/max1986ms excludes model jobs.

Hosted migration applied through the authorised CLI, runtime password set separately, and four production secrets uploaded via stdin. Verified `current_user=apecs_server` and empty hosted runs. Pooler TLS required Supabase's public CA; pinned official certificate with hostname verification, never disabling TLS validation. Supabase security and performance advisors found no warnings. Local password is configured in ignored `.env.local`; provisioning credentials in ignored `.env.deploy.local`, never uploaded in a deployment bundle. Local preview3000 returned200. No Git commits are automatic under AGENTS.md.

## Live deployment verified

Production: https://apecs-card-game.vercel.app ; `/admin` is private password login, `/leaderboard` is the public display. Final deployment `dpl_5LRxQ9UiNN13K44hjGM6FhH16Qa9` READY in Frankfurt, Node22 requested. Real public API test:30 players/300 actions, **p50 332ms / p95 784ms / max951ms, zero errors**, model evaluation excluded. Verified admin reset/activity/idempotency and unauthorised admin401. Generated test games were removed by explicit verified IDs and browser hashes; readback confirms0 games/actions/audit/model results, no attendee data changed. Actual390px browser flag/login check passed with0 page errors; screenshots reviewed. Final small contrast fix improves empty-state and logout legibility; published computed styles verified. GitHub source changes remain uncommitted under project instructions; deployment is via CLI, not automatic Git integration.
