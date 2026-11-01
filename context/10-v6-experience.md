# Active 0.6 experience — 27 October 2026

The user authorised a phone-first visual revision, one confirmed policy selection per round, special rounds4 and7, rare cards, authentic photos, SVG country flags, qualitative resources and sound effects. All adoption remains in2026. Earlier saved games retain their versions. No player deck or live climate simulator was added.

## Round contract

There are ten rounds: eight policy hands and two optional challenges. A policy hand offers three eligible cards; select up to three within aggregate budget and commit once. Commitment resolves frozen pre-play quotes, records each outcome, applies the once-per-round settlement, increments revision once and deals the next hand. Skip saves two extra credits. Shuffle costs1,2,3… in the same round. Starting credits14, allocation base3/gross cap7 minus upkeep, transition target150. Existing preparation paths, costs, approval/fatigue, distinct-card family perks, eleven combinations, announced procurement/stress-test and score weights remain. Rare categories also contribute to family perks.

Saved0.5 retains repeated policy plays and explicit End round;0.4 and earlier retain dated decisions. Dispatch is exact-version in engine.ts. v6.ts composes preserved v5 primitives; no server trusts client-provided cost, effect, approval, score or reward.

## Special rounds

Round4: Ice courier, a tap/Space flying course. Fixed60Hz physics,18-second cap, increasing speed and narrowing gaps; collisions end the attempt. Score=min(100,round(7*passedGates +15*elapsedFrames/1080)). Round7: Grid pulse, five precision taps at least24frames apart; the pulse accelerates and tolerance shrinks. Accuracy per hit=max(0,1-distance/tolerance); total=round(sumAccuracy*20).

Choose credits/economy/politics/awareness/fairness before beginning. Begin records a server timestamp and locks the resource. Finish submits bounded strictly ordered input frames and a bounded end frame. The server checks elapsed time, replays inputs with the same pure challenge functions, then grants floor(score/14) credits (max7) or floor(score/5) resource points (max20). One claim advances the round. Skipping is allowed even during an attempt; special rounds never earn the policy saving bonus. Funding still settles once. These rewards never become physical climate inputs or direct mitigation gains.

The fixed public course is separate from the secret policy random seed. Replay validation prevents arbitrary score injection but cannot prove a human played or prevent optimised scripts. Do not call this prize-ready anti-cheat. Reloading an active attempt can restart the local course; its reward choice remains locked and there is still only one final claim.

## Rare cards

Three authored rare cards join48standard cards. A rare occupies at most one offer slot, with a guaranteed opportunity in round5 and otherwise19%eligible-deal chance after round2. Successful rare cards cannot repeat. Gold frame/glow and a Rare label identify them; the card/details name the type of risk while exact numerical consequences are server-resolved after adoption.

| Card | Base cost | Upside | Possible surprise |
| --- | --- | --- | --- |
| Great Grid Leap |12|35base transition,12economy;2upkeep|−24fairness/−10politics, or−22economy |
| Emergency Climate Levy |10|14credits,18base transition,8economy|−26politics, or−22fairness/−10economy |
| Rewilding Pact |11|32base transition,12fairness,12resilience|−24economy, or−24politics/−8awareness |

Normal discounts, political effort, awareness effectiveness and refunds apply. A rejected rare gets neither upside nor surprise. All numbers and social interpretations are designer assumptions. No temperature effect is assigned to these new cards.

## Interaction and assets

Home: Cryosphere Futures / APECS title, nickname, searchable country picker and Play. Flags are localSVGimages, so Windows no longer substitutes regional-letter glyphs. The supported ISO list has a flag asset for every entry. The picker uses a native dialog, keyboard search/options and lazy images.

Game: direct card tap focuses/selects; the separate info button opens details. One Play confirms the entire hand; Shuffle is a prominent neighbouring button. Resource bars use Very low<20%, Low<40%, Steady<70%, Strong<90%, Very high>=90%. Raw numeric credits and approval remain because they drive decisions. Card arrows show direction/strength; precise rules stay in About/Library. Resource meanings are accessible from the HUD. Round gems mark special rounds without a future-year timeline.

Real NASA photography replaces generated background/card art. Local compressed files, captions, photographer credits and crop notes are in public/art/photos/credits.json and /credits. Generated atlases are retained historical files. Flag-icons7.6.0 is MIT-licensed with a local licence copy. Web Audio supplies original short effects; mute persists, including on the home screen. Touch/keyboard alternatives, visible focus, reduced cosmetic motion and short-screen card layout are retained. A skip alternative is available for the two moving skill challenges. No extra runtime dependencies were added.

## Visual references and verification

Reviewed primary material: [Mega Crit press kit](https://www.megacrit.com/press-kits/slay-the-spire/), [official rarity/mobile UI discussion](https://www.megacrit.com/news/2024-11-07-neowsletter-issue-4/), official Steam [Slay the Spire](https://store.steampowered.com/app/646570/Slay_the_Spire/), [Paladins](https://store.steampowered.com/app/444090/Paladins/) and [Balatro](https://store.steampowered.com/app/2379780/Balatro/) galleries/trailer frames. Isolated browser captures under screenshots/references are research, not shipped game assets. Trailer playback and screenshots do not constitute playing the commercial games. Applied principles: clear hand selection, saturated family identity, tactile cost/frame hierarchy, rarity distinction and brief feedback. Proprietary art/code was not copied.

Verification belongs in06-progress.md. Human fun/3–5minute timing, actual iPhone/Safari, venue Wi-Fi, audio on real phones, screen-reader use and prize fairness remain separate from automated checks. Scientific access and combined-scenario validation remain pending under04-models.md/09-enroads-mapping.md.
