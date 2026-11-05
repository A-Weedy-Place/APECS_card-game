# Climate models and designer assumptions

## Current0.11 update (2026-11-05)

[0.11 stages](16-v11-stages.md) records the35-card catalogue, exact targets and profile change to En-ROADS26.11.0. The public tool redirects26.10 URLs to26.11; new jobs therefore use a distinct complete-scenario cache profile. Completed26.10 results stay version-pinned and available for older games. Two complete19-control packages were verified against the current public UI, including slider midpoints and endpoints. Population/GDP remain scenario assumptions; social effects and budgets remain design choices. The experimental laptop worker remains necessary for uncached combinations pending supported SDK access.

## Current0.9 update (2026-10-31)

[0.9 model-game record](13-v9-model-game.md) supersedes the0.8 integration status below for new games. User has no SDK but requested runtime public-UI interaction. Local browser prototype round-tripped mixed/all19-factor scenarios in26.10.0. New0.9 results remain pending until full readback succeeds, then carry actual displayed output and provenance. Not vendor approval, SDK rights or event-ready reliability. Original adapters below remain unchanged for saved games. Social effects and model target choices remain the game's responsibility.

## Archived 0.8 and earlier contract

No climate simulator is connected. Current rules `prototype-0.8` use ten 2026 planning rounds, including two optional arcade challenges. Model output remains `illustrative`, version `0.8`, pressure `max(0, round(100-transition/150*100))`, with an empty trajectory and no temperature. Arcade rewards affect resources only; they do not become physical simulator inputs. Rare cards have invented game effects and no numerical En-ROADS mapping. The existing 21 standard-card /17-control input proposals remain separate from game scores. The 2100 horizon is for future licensed and validated evaluation. Saved 0.6/0.7 use the same index contract with their original version numbers and rules/challenges preserved. Preserved 0.5 behavior is documented below.

## Current 0.5 input metadata and limits

`src/game/climate-levers.ts` supplies 17 documented En-ROADS controls used by 21 cards. The [mapping review](09-enroads-mapping.md) contains exact targets, units, verified bounds, live source version, baseline, timing and exclusions. Values such as a $100/ton carbon price are **designer-selected targets inside official control ranges**, not Climate Interactive recommendations or predictions of policy effectiveness. Card costs, transition points, approval, economic effects, public support, upkeep and score weights remain game assumptions.

Official [use and citation guidance](https://support.climateinteractive.org/support/solutions/articles/47001266571-how-to-use-and-cite-en-roads-and-c-roads) verifies free online use, CC BY 4.0 documentation and separately available commercial/noncommercial SDK licences. No public runtime/API contract or SDK access has been established for this project. The supported next integration step is authorised model access, not scraping/private-endpoint automation. No organisation was contacted.

The inspected [En-ROADS v26.9.0](https://en-roads.climateinteractive.org/scenario.html?v=26.9.0) controls have a **2027 minimum implementation start**. Metadata therefore distinguishes adoption in 2026 from model start 2027 and subsequent phase-in/capital turnover. Playing a card in planning round 10 must not move its start to 2095. Real implementation is not instantaneous simply because the package is adopted now. Some controls are annual rates, others subsidies, achievable-potential fractions, or end-century targets; they are not interchangeable percentage emissions cuts.

Accepted policy IDs alone assemble `climateScenario`; rejected actions and round-end markers are excluded. Overlapping controls take the strongest input target, never a sum of per-card temperature changes. This assembly rule is our scenario design, not a validated model interaction. Broad solar/wind, heat, transit, efficiency and industrial cards disclose aggregate proxies. Wetlands, grid and maritime freight have no numeric mapping yet. Enabling social/finance/justice and adaptation cards have no automatic temperature effect; the game's economy bar does not alter En-ROADS GDP.

Current transition gains have no early-decade multiplier. Awareness, prerequisites and combinations still affect game scores but do not modify the scientific input metadata. Actual scientific evaluation must run the **whole package**, preserve all timing/switch settings and compare with official results. Until then, UI disclosures say input targets have not been run in En-ROADS. Attribution names Climate Interactive/MIT Sloan and clearly identifies adaptations without endorsement.

## Preserved historical adapters

For 0.4, `projectFor(history, rulesVersion)` in `src/game/model.ts` accumulates recorded transition gains and calculates `max(0, round(100 - transition/180*100))`. The target denominator is **180**, matching the transition score target; pressure reaching zero means that game target was reached. It does not mean zero warming, emissions, risk or ice loss. The trajectory starts at 2026/100, records the index after each five-year decision from 2030 through 2095, and repeats the final index at 2100. It is a history of game points, not a simulated physical time series. Projection `kind` remains `illustrative`, model name remains `Illustrative game index`, and projection version is `0.4`.

Saved 0.1–0.3 games retain `climateAdapter`/`demoAdapter` behavior: `max(0, round(100-transition))`, the original seven-decision history, and projection version `0.1`. Rule-set version and adapter version are different fields. Existing histories are not reinterpreted with the 180 target.

Version 0.4 approval odds, awareness-dependent effectiveness, political effort, economy pressure, upkeep, justice protection, resilience thresholds, card prerequisites, buffs and synergy bonuses are invented game mechanics. The scheduled supply squeeze and disruption drill are authored scenarios, not forecasts. The score's 600/150/100/75/50/25 component weights are design choices, not scientific or ethical rankings. [Mechanics research](08-mechanics-research.md) records the primary sources, qualitative rationale, disagreement over stochastic outcomes and fairness limitations. Those sources do not validate any numerical calibration.

Justice and adaptation do not automatically lower temperature or generate transition points. Dedicated adaptation, loss-and-damage and participation choices have no direct transition gain unless a card explicitly includes a mitigation action. Resilience protects against a game disruption and has its own score component; it never feeds the illustrative pressure formula. Coal-exit disruption depends on preparedness in the game and must not be described as a universal law that mitigation harms economic growth. The playfield/result caveats identify game points and no forecast; no scientific temperature is displayed.

## Integration contract

The climate adapter and version router live in `src/game/model.ts`. A projection carries its kind, model name, version, trajectory and caveat. `temperatureC` is optional and remains absent for demo output. Social indices, resilience and the leaderboard score are separate from any future physical climate model. Moving the current game modifiers into a physical simulator requires a new mapping/evidence review.

Before replacing the adapter:

1. Verify the chosen model's supported access, version, licence and reuse conditions from its official publisher. Do not infer a public API or SDK from the existence of an interactive website.
2. Define what geography and emissions baseline the game represents. The current prototype is an abstract global strategy, not a specific country's NDC.
3. Map each mitigation card to quantified model inputs with units, timing, bounds, assumptions and evidence. Cards are not interchangeable with model sliders.
4. Keep awareness, political support, economic effects and justice as clearly disclosed game assumptions unless a separate defensible model supports them.
5. Validate timing for the selected rules version. For 0.5 all adoption is 2026, with implementation starting no earlier than the referenced model permits (2027 in inspected v26.9), appropriate ramps and physical response evaluated through 2100. Old 0.4 used 2030–2095 decisions; earlier saves 2030–2090. Do not silently reinterpret old histories or treat their former early-action scoring multiplier as model timing.
6. Compare cached or emulated results against official runs, document uncertainty, and add regression tests before displaying °C.

Runtime options are an authorised local model, a supported API, or a verified library of precomputed scenarios. Browser agents controlling a simulator are not part of the multiplayer runtime. They add delays, fragility and usage uncertainty. A lookup table must cover policy timing and combined effects, not simply add individual slider outcomes.

Current 0.5 allows multiple cards and reshuffles within ten rounds, so fixed single-card branching counts do not describe its state space. Historical 0.4 had `3^14` simple ordered choice paths, or `4^14` including Skip, before approvals/redraws/prerequisites. Earlier seven-decision counts were `3^7` or `4^7`. None is the number of unique model scenarios. Cache equivalent physical input packages and versioned timing/settings, not every sequence of game clicks.

## Sources and attribution

[En-ROADS](https://www.climateinteractive.org/en-roads/) is now a verified source of control metadata, not an integrated simulation dependency; [C-ROADS](https://www.climateinteractive.org/c-roads/) remains another candidate. En-ROADS documentation reuse is verified as CC BY 4.0; runtime/SDK access still requires an integration-specific arrangement. IPCC framing of [equity and climate justice](https://www.ipcc.ch/report/ar6/wg2/chapter/chapter-1/) informs the distinction between mitigation, adaptation, vulnerability and fairness, not the numerical justice score.

Attribution must name the model, version, scenario assumptions and card mappings. A credible model does not transfer responsibility for custom mapping errors or speculative social effects to its publisher. Do not imply institutional endorsement.
