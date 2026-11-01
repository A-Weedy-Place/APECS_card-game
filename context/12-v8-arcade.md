# 0.8 arcade revision — 28 October 2026

The user requested a better-looking, smoother Flappy-style interlude and replacement of the timing game with a simple themed shooter/dodger. No policy/economy changes were requested. New games use 0.8, composing the unchanged 0.7 policy engine and new pure arcade courses. Saved 0.6/0.7 runs and attempts retain their original challenge physics, payouts and history. Current-version standings remain separate.

## Courses and art

Round 4: **Flappy Flight**. Tap the playfield/Flap button or press Space/Enter to guide an original puffin through icy passages. Speed rises and gaps narrow gradually; centred passages contain bonus beacons. Score = min(100, round(5×passages + 2×beacons + 15×elapsedFrames/1080)). Contact or ground/ceiling ends the run. Pure initial state, gate geometry and physics are in `src/game/arcade.ts`.

Round 7: **Reef Rescue**. A fish automatically shoots bubbles. Tap a lane, drag vertically, use Swim up/down buttons or Up/Down/W/S to steer between three lanes. Plastic bottles/cans take one bubble, bags two; orange nets cannot be popped and must be dodged. Three hits end the run, with a brief invulnerability window. Four consecutive cleanups grant three seconds of faster bubbles; missed trash/hits break the streak. Spawn rate and travel speed increase. Score = clamp(round(4×cleared + 2×bestStreak + 20×elapsedFrames/1080 − 3×hits), 0, 100).

Both have a 2.4-second ready countdown, at most 18 seconds of fixed-60Hz active physics, explicit Start/Pause/Resume controls, tab-hide auto-pause, optional sound and a one-time resource choice/claim. No new runtime dependencies. `arcade-art.ts` draws original crisp, high-DPI Canvas vectors: layered Arctic sky/water/ice, puffin and beacons; ocean rays, coral/kelp, fish, litter, nets, bubbles and small impact particles. Reduced motion removes ambient movement and particles, not essential course motion. Skip remains an alternative. Graphics do not reuse commercial game sprites or replace the 51 card photographs.

## Authority and practice

`v8Special` checks ownership through the existing store, rules/round/attempt kind, locked reward, elapsed time and bounded input logs. Flight submits ordered flap frames; cleanup submits an empty flap log and ordered `{frame,lane}` moves. Lane changes are separated by at least three frames and capped at 180; flight keeps its 150-input cap. The server replays the pure simulation, ignoring any claimed client score, and grants the existing 0.7 capped reward through the shared once-per-round settlement. Private policy seeds are not used for arcade courses. Replay validation cannot prove human play; this is not prize-ready anti-cheat.

`/arcade` is a local practice page with both games and unlimited retries. It does not start a policy run, consume a browser play, call scoring APIs or earn game resources/leaderboard points. Real runs use `ArcadeRound`, practice shares `ArcadeGame`; physics and drawing are not duplicated. A failed authoritative begin does not start a live challenge. Reloading an unfinished saved attempt restarts its local course without unlocking the resource or permitting a second claim.

## Verification

Final checks passed: `npm test` 95/95 (including six arcade suites), typecheck and production build. All eight isolated Edge browser scenarios passed in 2.4 minutes, including both practice courses, button/lane-tap/pointer steering/keyboard controls, countdown, pause/resume, repeat practice, reduced motion, phone and landscape fit, real in-game begin/claim and exact cleanup replay/score parity. Existing phone/card/library, quota/admin, full-game, projector and 40-player checks also passed. The latter completed 400 rounds/396 policy attempts, local p95 1058ms/max1451ms; no venue guarantee. Reviewed ready/active/paused course screenshots. Preview home, `/arcade` and `/leaderboard` returned HTTP200; public rules are 0.8 with zero preview entries. Tests used port3001/fresh databases and did not modify attendee records.

Remaining human checks: fun/difficulty and comparative reward balance, physical iPhone/Safari/audio, assistive technology, venue performance and competition fairness. Pure controllers establish deterministic scoring/bounds, not whether people enjoy it. Policy costs/social effects and arcade scores remain designer assumptions. No live climate model is connected.
