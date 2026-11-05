# 0.11: 35 cards and three stages — 2026-11-05

User requested a smaller catalogue tied to En-ROADS controls, nine policy rounds in three groups, two endless skill breaks, first-step prerequisites, mutually exclusive nuclear choices, severe scenario-risk penalties and three gold support rares. Existing saved games keep their original engines. `engine.ts` dispatches0.11 before the shared model-family0.9 guard. Current source: `v11.ts`, `v11-catalogue.ts`, `v11-schedule.ts`; public reference: `public/card-guide.md`.

## Schedule and economy

Displayed `1 2 3 ★ 4 5 6 ★ 7 8 9`; internal indices0–10. All adoption remains2026; no decades advance. Policy rounds allow one package of1–3 offered cards, or Skip. Start8, bank20, ordinary income3+floor(revenue/25), no skip bonus. Ordinary settlement costs3politics (6 if revenue<25) and1engagement. Shuffle costs1,2,3… within a policy round and resets at settlement. Early offers favour affordable common support cards; rares have6/12/18% stage-specific replacement probability after prerequisites. These are designer choices, not calibrated social science.

Arcade breaks use the new `endless` physics variant. Neither course ends at18seconds. Difficulty increases until collision/death; server replays inputs and rejects early, impossible or unfinished submissions.1coin per4seconds survived, cap8 per break, bank20. Arcade settlement adds no ordinary income or social-resource change. Legacy physics remain intact. Practice consumes no attendee start and awards no game coins. Pointer movement, keyboard controls and pause remain available. Request bodies allow128KiB for longer input logs; real elapsed time bounds replay before processing.

## Catalogue and approval

26 model cards: coal/oil/gas/bioenergy2each; renewables1; nuclear2 mutually exclusive; new-zero2; carbon-price2; transport2; buildings/industry2; population1;GDP1;nature/tech removal1each;agriculture/waste/deforestation1each. Six paired controls and nuclear contribute three possible states each; the remaining12 controls have two each: `3^7 * 2^12 = 8,957,952` combined input packages before game constraints. Do not precompute blindly or add per-card cooling. Cache identical complete19-input packages on demand.

Midpoints use halfway between baseline and the selected endpoint, rounded to the public UI's integer step: coal85/200,oil108/200,gas85/200,bioenergy93/200,carbon-price128/250. New-zero breakthrough1/2. Other targets are documented in the guide. Nuclear subsidy−100 excludes tax+50 and vice versa. Second model upgrades need the first successfully adopted and stage2+. A first-step rejection does not unlock an upgrade.

Population9bn and GDP/person growth0.5% are red high-risk **scenario assumptions**. Population's historical one-child-policy photo illustrates coercion/rights/trust risks, not a proven intervention-to-population mapping. No claim of guaranteed cooling or endorsement. Population sharply damages politics/engagement; GDP sharply damages revenue/politics. Public engagement and justice remain distinct concepts, even though Fair transition uses the game's engagement resource.

Support paths: Revenue programme → Long-term finance or rare Climate finance breakthrough; Community dialogue → Fair transition or rare Public climate movement; Build a coalition → Cross-party agreement or rare Win an election mandate. Base support cards repeat; advanced/rare cards are single adoption. Support has no direct model input. Mandate grants96–99% later ordinary approval, not guaranteed rare approval. Common support approval100%; model approval depends mainly on politics, secondarily engagement, difficulty and completed policy rounds, floor5%. Package costs/quotes are fixed before outcomes; support selected in the same package influences subsequent rounds, not that package's quoted probabilities. Severe failures and scarce coins remain deliberate game assumptions.

## Public model and preserved results

The public En-ROADS site now redirects26.10 to26.11.0. Adapter and new cache profile are pinned to `enroads-main-26.11.0-defaults-2026-11-05`. Real public-UI readback verified all19 controls for the first/single endpoint package and the second/single endpoint package (both displayed+1.6°C). These diagnostic packages ignore game affordability and were not inserted as player results. Slider increments for midpoint taxes/carbon price were verified in the public UI.

Completed26.10 cache entries are validated against their own original version/profile and remain preferred for older saved attempts. New0.11 cannot reuse those results. Old pending jobs are marked failed with a retry message when the new worker claims them, avoiding a queue blockage. A fresh request uses the current profile. GET/model and requestModel use the owned run's version-aware evaluation. Last adopted absolute target replaces its predecessor. No substitute temperatures; pending/failed do not rank. Laptop worker restarted asPID24608 after verifying no active job; logs are `data/model-worker-v11.log` and `data/model-worker-v11-errors.log`.

This remains the authorised experimental public browser bridge, not an official API/SDK or event-scale service. Attribution and original En-ROADS identity stay visible. Revenue is separate from model GDP. Licensing/SDK access and human/physical-iPhone/event-scale validation remain outstanding.

## Assets and verification

35 distinct card images selected from the attributed photo library. Added a real historical Chinese family-planning sign by Venus / Planet Love, CC BY2.0; source/licence in the photo manifest and `population-history.licence.txt`. Gold/red pulses honour reduced motion. Compact Library groups match the requested energy/transport/buildings/growth/removal/other order.

Verified before final publication:114-unit suite passed; six focused0.11 tests passed including separate26.10/current caches; typecheck/build passed; five isolated Edge scenarios passed, including actual survival reward,320px catalogue geometry, stage strip, Library/History and red/gold cards. Final build/production verification and worker restart are recorded in Progress. Physical iPhone/Safari and human fun/balance remain unverified. No schema migration or paid service added.
