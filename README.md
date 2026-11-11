# Cryosphere Futures

Cryosphere Futures is a browser-based climate policy card game built for the APECS UNFCCC Project Group and the COP31 Cryosphere Pavilion. Players adopt policies, manage their budget and see the projected 2100 warming for their final scenario in En-ROADS.

[Play the game](https://apecs-card-game.vercel.app/) · [Live leaderboard](https://apecs-card-game.vercel.app/leaderboard) · [Arcade practice](https://apecs-card-game.vercel.app/arcade) · [Card guide](public/card-guide.md)

## How it plays

- Choose up to three affordable cards in each of 12 policy rounds. The 35-card catalogue includes 26 cards mapped to all 19 En-ROADS controls and nine cards for revenue, politics and public engagement.
- Start with eight coins and earn four per ordinary policy round at the starting revenue level. Three revenue upgrades can bring that to five, six and eight coins per round. The wallet holds up to 20 coins.
- Play Flappy Flight and Reef Rescue after rounds four and eight for extra coins. Both games also have a separate practice mode.
- A finished game automatically submits its scenario for evaluation. The leaderboard shows all visible, verified results and ranks them by lower projected warming, then shorter play time.

## Run locally

Use **Node.js 22.13 or later in the 22.x line** and npm.

```sh
npm ci
npm run dev
```

Open the game at `http://127.0.0.1:3000`. The default database is `data/game.sqlite`. The development admin password is `polar-local` unless you configure your own. [Local game](http://127.0.0.1:3000) · [Local admin](http://127.0.0.1:3000/admin)

Put optional settings in an ignored `.env.local` file or export them in your shell. `npm run dev:lan` lets phones on the same network connect to the development server and requires a private organiser credential. Set the QR join URL in Admin to the laptop’s reachable address. [Local operations](context/05-operations.md#phones-and-venue-networking)

| Setting | Use |
| --- | --- |
| `ADMIN_TOKEN` | Local organiser password |
| `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET` | Hosted organiser login and session signing |
| `DATABASE_PATH` | Optional local SQLite path |
| `DATABASE_URL` | PostgreSQL connection for hosted storage |
| `NEXT_PUBLIC_GAME_URL` | Public join URL used as the QR fallback |
| `ENROADS_BROWSER_ENABLED` | Set to `0` to disable local simulator automation |
| `ENROADS_BROWSER_CHANNEL` | Browser channel used for local evaluation, with Edge as the app default |
| `MODEL_QUEUE_ENABLED` | Set to `1` in the hosted game to queue model jobs in PostgreSQL |

## Host and operate

The live game uses Next.js on Vercel and Supabase PostgreSQL for game state, model jobs and the result cache. A separate Vercel worker uses Playwright to evaluate queued scenarios. An optional Windows worker can take waiting jobs when the laptop is signed in and online. [Hosting and admin](context/14-hosting-admin.md) · [Scoring worker setup](context/15-v10-experience-worker.md)

The evaluator uses the public En-ROADS simulator and verifies the full set of model inputs before saving a temperature. En-ROADS outputs are conditional projections. Card costs, approval odds and social effects are game-design assumptions. En-ROADS is a tool created by Climate Interactive and MIT Sloan. [Model use and citation guidance](https://support.climateinteractive.org/support/solutions/articles/47001266571-how-to-use-and-cite-en-roads-and-c-roads)

Use Admin to manage game records, reset play allowances, configure the display QR and export event records. Save a timestamped CSV and JSON copy of the live standings from the project folder with the following command. The files go in `data/leaderboard-backups`. [Live admin](https://apecs-card-game.vercel.app/admin)

```sh
node --import tsx scripts/backup-leaderboard.ts
```

## Test and verify

```sh
npm test
npm run typecheck
npm run build
```

For browser tests, install Chromium in the project’s Playwright directory, then run the suite against the completed build. The test server uses port `3001` and a separate SQLite database.

```sh
PLAYWRIGHT_BROWSERS_PATH=./.playwright npm exec playwright -- install chromium
npm run test:e2e
```

On Windows with Edge installed, you can run the suite with Edge.

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm run test:e2e
```

## Repository layout

| Path | Contents |
| --- | --- |
| [`src/app`](src/app) and [`src/components`](src/components) | Web pages, API routes and UI |
| [`src/game`](src/game) | Rules, card catalogue, arcade mechanics and ranking |
| [`src/server`](src/server) | Persistence, admin access and model queue |
| [`scripts`](scripts) and [`deploy/model-worker`](deploy/model-worker) | Operations, diagnostics and scoring-worker deployment |
| [`supabase/migrations`](supabase/migrations) and [`tests`](tests) | Database schema and verification |
| [`context`](context/README.md) | Project notes and maintenance history |

## Licence and credits

The original game code and documentation are licensed under MIT. [MIT License](LICENSE)

Photographs and flag assets carry the terms listed in their attribution records. [Game credits](https://apecs-card-game.vercel.app/credits) · [Artwork provenance](public/art/PROVENANCE.md) · [Flag licence](public/flags/LICENSE.txt)
