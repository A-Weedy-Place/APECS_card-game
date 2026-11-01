# Prototype game rules

## Current 0.9

Read [0.9 model game](13-v9-model-game.md) for current rules: 67 cards, 19 model controls, three resources, progressive prerequisites, an expensive election mandate and temperature/time ranking. The rules below are archived 0.7 and earlier behavior, preserved for saved games. New 0.9 results have no illustrative pressure or weighted point score; they remain pending until a complete model readback succeeds.

Rules version:`prototype-0.7`. Read11-v7-refinement.md for the scarce-coin/strong-politics revision. Ten2026rounds, optional challenges4/7, one package per policy round, starting8coins, bank20, normal income only on Skip. Saved0.6 keeps its14startingcredits/+2skip; other versions remain frozen. All costs/social/scoring values remain designer assumptions and no physical forecast is active.

## Preserved 0.5 rules — ten planning rounds in 2026

Implementation: `v5.ts`, exact-version dispatch in `engine.ts`, `config.ts` and `model.ts`. All policies are adopted in 2026. The ten rounds (`r=0..9`) represent negotiations, not years. Future physical outcomes through 2100 are not yet calculated. Internal phase labels are Foundation for `r<3`, Momentum for `r<7`, then Transformation; they do not gate technology. `V5_CARDS` copies the 48-card, ten-path catalogue with `minRound=0`, retaining prerequisites, families, tiers and eleven combinations. Saved catalogue data is not mutated.

### Offers and multi-card play

Three eligible offers appear at round start or reshuffle, retaining 0.4's upgrade/action, enabler and wildcard mix and reliable-recovery preference. No affordable-hand guarantee. Successful prerequisites open successor eligibility immediately, including later offers in the same round. Successful nonrepeatable cards cannot reappear; failed cards can return after reshuffling. There is no owned deck.

Select one to three different offered cards. Their prerequisites must already be met, and the whole quoted cost must fit the current budget. Expected refunds or gains cannot fund the batch. Costs, odds, effects and transition/resilience gains are frozen against the displayed pre-play state. The server resolves cards in **offer order**, not client selection order, and rolls approval independently. Benefits unlocked inside the group apply to subsequent plays, not other already quoted cards. Each attempted card leaves the current hand; unselected offers remain. Batch commitment increments revision once and records one history entry per card, but does not advance round or award allocation.

Players may use remaining offers, reshuffle and keep playing in the round. Reshuffling costs 1, 2, 3… credits within that round. It advances revision/redraw salt, not round/history. The price resets **only at explicit End round**, not after each card. End round is always possible. If no policy was attempted, Skip adds 2 bonus credits; rejected attempts count, so they do not also earn a skip bonus. Shuffling alone preserves skip eligibility. Ending round 10 finishes the run; total cards played may exceed ten.

Card history entries have `kind: policy`, `planningRound`, `year: 2026` and income 0. Round-end entries have `kind: round-end`, adoption year 2026 and maintenance/allocation records. Round-end/save markers do not count as played cards, prerequisites or climate inputs.

### Budget and negotiating pressure

Start with **12 credits**, economy 55, politics/support 70, awareness 30, justice 25, transition/resilience 0. Credits remain bounded 0–999 and social resources/resilience 0–100. Upkeep from distinct accepted infrastructure remains capped at 3. Gross planning allocation is `3 + floor(economy/25) + economicsPerk`; net is `max(1, min(7, grossAllocation) - upkeep)`. The perk contributes 1 when active. Allocation occurs only after round end, never per card, and never after the final round. This is financing capacity in a planning exercise, not years of real revenue or GDP.

The 0.4 cost discounts, six distinct-card family bonuses, eleven named combinations, conditional coal retirement and justice protection remain (see preserved tables below). Enablers pass at 100%. Actions use `round(clamp(48 + .38*politics + .20*awareness + .12*economy - difficulty - 1.7*r + bonuses, 5, 95))`. The round term is authored **negotiating fatigue**, not delayed physical implementation. Action mandate is `max(1, 2*tier + floor(r/5) - applicable discounts)`.

Rejection loses 2 politics, grants no positive effects/unlocks and refunds `floor(cost*.5)`, or `floor(cost*.75)` with the justice perk. It does not end the round. At round end political decay is `max(0, 3 + economyStress - justiceThreshold - durableMandate)`: stress is 4 below economy 25, 2 below 40, −1 at 70+, otherwise 0; justiceThreshold is 1 at justice 50+. Awareness decays by 2, by 1 with its family perk, or 0 with Trusted evidence. Decay/allocation use post-action and post-event state. No maintenance, event or allocation follows the final round.

Round **6** has Tight procurement: technology +1 cost unless economy>=70. At the end of round **8**, the Budget stress-test applies −6 economy and −5 politics, halved (losses rounded up) at resilience 20 and prevented at 40. Newly adopted protection counts. This disclosed exercise occurs before ordinary maintenance/allocation; it is not a disaster forecast for a future year.

### Score and model-input proposal

Transition is `round(baseTransitionIncludingPriorSynergies * (.7 + .003*clamp(awareness)))`. There is **no early-action/remaining-round multiplier**. Same card plus same social state yields the same transition gain in any planning round. Awareness remains an assumed game mechanic, not an En-ROADS multiplier. Zero-transition adaptation/loss-and-damage remain zero.

Score is out of 1000: transition 600, justice 150, resilience 100, economy 75, politics 50, awareness 25. The transition cap is now **150 game points**, with component `round(clamp(transition/150*100)*6)`; other formulas remain as below. Leftover credits earn no score. Pressure is `max(0, round(100-transition/150*100))`, never °C, emissions or ice loss. New projection trajectory is **empty**, preventing negotiation history from masquerading as physical evolution.

`climate-levers.ts` maps 21 cards to 17 documented controls; [mapping review](09-enroads-mapping.md) records units, live bounds, baseline, timing and proxy limits. Accepted policies alone assemble the scenario. Shared controls keep the strongest policy target without adding percentages or per-card temperature changes. Game adoption 2026 is distinct from referenced En-ROADS implementation 2027 and later ramp/stock-turnover delays. Politics/economy/justice/adaptation do not become invented temperature inputs. No actual model calculation is connected.

Final 0.5 verification belongs in [Progress](06-progress.md). Earlier evidence below is historical, not proof of new-rule fairness.

## Frozen 0.4 reference — not active for new games

Implementation: `src/game/v4.ts`, `v4-cards.ts`, `config.ts`, `perks.ts` and `model.ts`. Research and the deterministic-versus-stochastic design debate are recorded in [Mechanics research](08-mechanics-research.md). Exact values below describe the code, not calibrated climate relationships.

### Turns, offers and library

Fourteen decisions occur in 2030, 2035, 2040, 2045, 2050, 2055, 2060, 2065, 2070, 2075, 2080, 2085, 2090 and 2095, followed by the 2100 result. The zero-based round index `r` runs from 0 to 13. Phase labels are Foundation for `r<4`, Momentum for `4<=r<10` and Transformation thereafter. There is no player-owned deck.

The catalogue has 48 cards and ten pathways: Clean power, Buildings, Transport, Industry & skills, Methane & evidence, Land & ecosystems, Food systems, Adaptation & solidarity, Mandate & knowledge, and Finance & fairness. Six colour families remain distinct from these pathways: technology, politics, economics, justice, awareness and nature. Card tiers, predecessor IDs and minimum rounds determine eligibility; phase labels do not replace those checks. Default tier availability is tier 1 from round 0, tier 2 from round 2 (2040), tier 3 from round 5 (2055). `requiresAll` needs every listed success; `requiresAny` needs at least one. Failed cards do not count. Successful cards leave eligibility except the explicitly repeatable Listen & regroup and Emergency revenue cards.

Three offers are sampled from the eligible pool: an eligible tier-2/3 successor where possible (including enabling successors), otherwise an action; an enabler; and a distinct-pathway wildcard where possible. When politics is below 30 or awareness below 15, the enabler slot prefers Listen & regroup. Remaining slots fill from the random ranking without duplicate IDs. There is no guarantee that a hand is affordable or that a particular successor wins over other eligible successors. Library entries expose current cost, odds, effects, locks and predecessor information; all eleven combo recipes are discoverable before activation.

Redraw costs 1, then 2, then 3, and so on within the current turn, without a fixed count/price cap. The counter resets after a committed card or Skip. A redraw spends credits, increments revision and random-offer salt, but not round/history; affordability is enforced. It excludes the current hand when at least three fresh eligible cards remain, otherwise falls back to the full eligible pool. Skip is always free, gives 2 credits and consumes the decision; ordinary next-turn income follows unless it was the final decision.

### Credits, income and maintenance

Starting resources: 10 credits, economy 55, politics/support 70, awareness 30, justice 25, transition 0 and resilience 0. Social resources and resilience are bounded to 0–100; credits to 0–999. Transition accumulates beyond its scoring target but earns no further transition score above 180.

Upkeep is `min(3, sum(upkeep on distinct successfully played cards))`: firm clean power, cleaner steel & cement and clean freight each contribute 1; monitored removals contribute 2. Rejections do not add upkeep.

Gross income is `1 + floor(economy/25) + economicsPerk`, with `economicsPerk` equal to 1 when active. Net income is `max(1, min(6, grossIncome) - upkeep)`. It therefore remains at least 1 even in a weak economy. Income is calculated after the action, event and maintenance; a newly unlocked economics perk counts immediately.

Economy affects approval and subsequent political maintenance as an authored scenario pressure. Define stress as 4 if economy<25, 2 if 25<=economy<40, -1 if economy>=70, otherwise 0. Political decay is `max(0, 3 + stress - (justice>=50 ? 1 : 0) - durableMandate)`. Awareness decays by 2, by 1 with its family perk, or by 0 with Trusted evidence. Decay uses the post-action/post-event state. No maintenance, event or new income follows the final decision.

Card cost is `max(1, baseCost - engineeringDiscount - skilledIndustryDiscount - stewardshipDiscount + supplySurcharge)`. Engineering gives technology -1; Skilled workforce gives industrial actions -1; Community stewardship gives land projects -1. Applicable discounts stack. The supply surcharge below is +1.

### Approval, effects and failure

Enablers resolve at 100% approval. Actions use actual server-controlled stochastic approval:

`round(clamp(48 + 0.38*politics + 0.20*awareness + 0.12*economy - cardDifficulty - 1.7*r + bonuses, 5, 95))`

Bonuses are +5 for the politics family perk, +6 for Trusted evidence, and +8 for Local consent on wind, nature or transport. Thus low support can make ambitious action very unlikely; low-cost preparation remains reliable. Odds, net effects, cost and rejection loss are previewed before commitment. These percentages do not estimate real legislative acceptance.

Successful action spends political effort `max(1, 2*tier + floor(r/5) - politicsPerk - justiceThreshold - durableMandate - skilledWorkforce)`. The first three deductions are 1 each when applicable; `justiceThreshold` means justice>=50; Skilled workforce deducts 2 for industry actions. Enablers spend no effort. At justice>=50, negative card support effects are halved with `ceil` before subtracting effort. The displayed support effect already includes effort.

A rejection consumes the decision, applies -2 politics, grants no transition/resilience/card effects, and refunds `floor(cost*0.5)` or `floor(cost*0.75)` with the justice family perk. Failed cards do not unlock successors, perks or synergies. Between-turn maintenance/income still follows. Replaying the same request remains subject to server ownership, revision and idempotency checks.

Conditional effects and transition are evaluated against the pre-play state, so a card does not use the combo it is itself unlocking. After success is recorded, new perks/combos apply to subsequent maintenance and future cards. Base transition including eligible synergy bonuses becomes:

`round(baseTransition * (1 + 0.02*max(0, 13-r)) * (0.7 + 0.003*clamp(awareness, 0, 100)))`

Zero-transition adaptation, justice and finance choices remain zero unless the card explicitly contains a mitigation action. Resilience is a separate bounded resource: listed gain plus +5 for nature under Living food systems, and +10 for a resilience-pathway card with positive resilience gain under Prepared communities. No resilience value is converted into temperature.

### Family perks and eleven combinations

Two **distinct** successful cards of a family unlock its perk. Repeating Listen & regroup or Emergency revenue does not manufacture additional distinct-card counts.

| Family | 0.4 perk |
| --- | --- |
| Technology | Technology costs -1, minimum cost 1 |
| Politics | Actions gain +5 approval and spend 1 less political effort |
| Economics | +1 gross income each turn, before upkeep |
| Justice | Rejection refund 75% instead of 50% |
| Awareness | Awareness decay 1 instead of 2 |
| Nature | +2 base transition on later nature cards with positive base transition |

| Combination | Required successful cards | Effect |
| --- | --- | --- |
| Connected power | Grid plus generation (grid already requires solar, wind or community power) | Heat, retrofit, transit, clean industry and freight gain +4 base transition |
| A managed exit | Grid + Protect workers | Coal-exit effects become +5 economy, +4 support before effort |
| Skilled workforce | Train the workforce + Protect workers | Industry actions cost 1 less and spend 2 less support |
| Patient investment | Green investment bank + Public purchasing | Successful cards with base cost>=7 return 1 credit; checks base cost, not discounted price |
| Trusted evidence | Climate in the classroom + Trusted local voices | +6 action approval; awareness stops decaying |
| Durable mandate | Citizens' assembly + Build a coalition | Political decay -1, action effort -1, coordinated climate pact +5 base transition |
| Community stewardship | Rights & stewardship + Keep forests standing | Positive-transition nature cards gain +4 base transition and +4 support; land projects cost -1 |
| Living food systems | Restore landscapes + Resilient farming | Regenerative food networks gain +6 base transition; later nature cards gain +5 resilience |
| Shared returns | Share the returns | Polluters pay support effect changes from -12 to +3 before effort |
| Local consent | Citizens' assembly + Participatory budget | Wind, nature and transport gain +8 action approval and +3 support; enabler approval remains 100% |
| Prepared communities | Early warning + Protect frontline communities | Later resilience-pathway investments with positive resilience gain add 10 resilience |

Coal retirement has a conditional scenario, not a universal growth penalty. Without replacement generation its economy effect is -15; with generation it is -7, or -2 with worker protection as well. Its base support effect is -14 without worker protection and -5 with it. Grid plus worker protection activates the managed-exit values above. Justice protection and political effort are then applied. Generation means solar, wind, community power or firm clean power. These values describe a hypothetical disruptive transition, not empirical economic estimates.

### Shared events, scoring and model boundary

The announced 2055 supply squeeze (round 5) adds 1 to technology costs only if economy<70. A forward notice is shown before that turn. The 2075 disruption drill applies after its action (round 9, before advancing into 2080 maintenance): -6 economy and -5 support at resilience<20; -3 economy and -3 support at resilience 20–39 (losses round up); no loss at resilience>=40. Resilience bought in the 2075 action counts. The drill is an authored shared scenario, not a forecasted climate disaster. Maintenance follows the event, so the receipt's decay can include both losses.

The six score components are rounded separately and summed, for a maximum of 1000:

| Component | Formula | Maximum |
| --- | --- | --- |
| Transition | `round(clamp(transition/180*100, 0, 100)*6)` | 600 |
| Justice | `round(clamp(justice, 0, 100)*1.5)` | 150 |
| Resilience | `round(clamp(resilience, 0, 100))` | 100 |
| Economy | `round(clamp(economy, 0, 100)*0.75)` | 75 |
| Politics | `round(clamp(support, 0, 100)*0.5)` | 50 |
| Awareness | `round(clamp(awareness, 0, 100)*0.25)` | 25 |

The illustrative pressure index is `max(0, round(100 - transition/180*100))`; it is never warming, emissions, ice loss or an En-ROADS result. Zero pressure means the game transition target was reached. See [Models and assumptions](04-models.md).

Balance evidence and limits: `scripts/balance-report.ts` compares heuristic strategies on shared seeds and reports distributions, saturation, cash pressure and route coverage. Such probes are not optimal play or proof of equal viable routes. Correct offer/receipt behavior and reliable recovery have independent checks recorded in [research](08-mechanics-research.md); final suites and measurements belong in [Progress](06-progress.md). Random deals and approval rolls still affect rankings. Actual human difficulty, learning, duration and prize fairness remain pending.

## Frozen 0.3 reference (not active for new games)

Rules version: `prototype-0.3`. The following describes preserved 0.3 runs, not current 0.5 rules.

Seven decisions and no owned deck remain. Three offers are randomly sampled within eligible roles: an enabling policy (base transition below 8), an action (8+), and a flexible third family where possible. One affordable offer is substituted if the entire hand is unaffordable. Save/Skip adds 2 credits; one free redraw uses no money or decade.

Initial resources remain credits 10, economy 55, politics 70, awareness 30, justice 25. Income = 2 + floor(economy/25). Unspent credits carry forward. Technology cards with 12+ base transition cost one more than 0.2. Larger investments require saving or finance; ecology is a lower-cost alternative, not a universal solution.

Action odds = clamp(64 + 0.3*politics + 0.22*awareness - difficulty - 4*roundIndex + buffs + event, 25, 98). Enabling actions use base 82, time factor 1.5 and minimum 70. Major actions spend politics: max(1, 4 + roundIndex + (difficulty>=10 ? 3 : 0) - politicsBuffDiscount - justiceDiscount). That spending is included in the card's displayed support effect, never a hidden penalty. Justice at 50 reduces the spending by 2 and halves negative policy support deltas; worker protection separately halves coal-exit support/economy penalties without double-halving them.

Rejection refunds floor(50% of cost), or 75% with justice buff, loses 3 politics and uses the decade. The offer shows exact odds, potential net effects, cost, political effort and loss on rejection. No positive effects occur on failure. Between decades politics decays 6 and awareness 4, except buffs below. Receipts record decay and income; no maintenance or income follows the final choice.

Two successful cards in a family unlock:

| Family | Persistent buff |
| --- | --- |
| Technology | Technology costs -2 (minimum 1) |
| Politics | +10 approval; major action political spending -3 |
| Economics | +2 credit income each new decade |
| Justice | Political decay 3 rather than 6; rejection refund 75% |
| Awareness | No awareness decay; +5 approval |
| Nature | +4 base transition on later nature cards |

2050 spotlight (+6 approval for politics, awareness, justice) and 2080 supply squeeze (+1 technology cost unless economy>=75) remain. Recovery options such as assembly/coalition/finance stay eligible late; no strategy is locked out by a randomly missing early draw. Coalition still unlocks the international deal. Successful policies cannot recur.

Transition delta = round(baseGain * (1+0.1*(6-roundIndex)) * (0.8+min(awareness,60)/200)). Awareness is evaluated before the card resolves, so displayed gains equal receipts. These are game implementation/early-action modifiers, not real emissions effects. Zero-transition adaptation and loss/damage remain zero. Score = 5*clamp(transition,0,100) + 2*justice + politics + economy + awareness, out of 1000. Pressure remains the illustrative 100-transition index, never °C.

Conceptual rationale: [IPCC WGIII Chapter 13](https://www.ipcc.ch/report/ar6/wg3/chapter/chapter-13/) discusses enabling conditions and policy packages; [Chapter 5](https://www.ipcc.ch/report/ar6/wg3/chapter/chapter-5/) discusses participation, trust and just transitions. Those sources motivate relationships only. They do not validate numerical odds, deadlines, decay, penalties, temperature mappings or scores. Slay the Spire's [official adaptation rules](https://contentiongames.com/_images/STS_KS_Rulebook.pdf) distinguish immediate attacks, utility skills and persistent powers. The analogy here is action, enabler and family buff, not combat or deck ownership. [Mega Crit's iterative balancing approach](https://www.megacrit.com/news/2026-4-17-neowsletter-issue-21/) supports repeated playtests rather than declaring balance solved.

`npx tsx scripts/balance-report.ts` compares six heuristic mixed approaches on 1000 shared seeds each, without persisting records. First means: burst 494, politics 545, awareness 553, economics 531, justice 545, nature 544. Burst wins sometimes (p90 617), but its last-round approval averages 46%, versus 83–86% on supported approaches. These probes are neither optimal policies nor proof of fairness. Need human playtests, challenge seed/prize design and checks against exploits.

## Frozen 0.2 reference (not active for new games)

### Turn sequence

1. Receive three random eligible cards from the current phase, excluding already successful policies.
2. Buy one affordable card or save the decade.
3. Resolve the displayed approval chance with a server-controlled roll.
4. Display a receipt, including effects or refund.
5. Between rounds, maintain the economy-derived income while support and awareness decay.
6. After the seventh decision, calculate the final score and publish the completed result.

The phases are Foundation for rounds 1–2, Momentum for rounds 3–5, and Transformation for rounds 6–7. Some low-cost and mitigation cards span every phase. If all three initial offers are unaffordable and an affordable eligible card exists, the third offer is replaced with it. Saving remains possible regardless of affordability. There are 36 cards across technology, politics, economics, justice, awareness and nature, not a deck owned by the player.

### Resources and approval

| Resource | Initial value | Effect |
| --- | --- | --- |
| Credits | 10 | Pay card costs; unused credits carry forward |
| Economy | 55/100 | Next-round income is `2 + floor(economy / 25)` |
| Political support | 70/100 | Contributes 0.29 percentage points per support point to approval |
| Awareness | 30/100 | Contributes 0.12 percentage points per awareness point to approval |
| Justice | 25/100 | Designer-defined inclusive transition component of the score |

Approval percent is `clamp(63 + 0.29*support + 0.12*awareness - difficulty - 1.3*roundIndex, 50, 98)`, rounded to an integer. The round index begins at zero. Accepted cards apply their listed effects. Rejected cards apply no effects, refund `floor(cost * 0.75)` credits, and consume the turn. Support drops by 3 and awareness by 2 before the next turn. No decay or income is applied after the final decision.

Version 0.2 adds the family and event modifiers below before the final approval clamp. The card preview always uses the server-calculated actual cost, odds, effects and early-action-adjusted transition points.

### Family perks and decade events

Two successful cards in a family unlock its permanent perk. Rejected policies and saving do not count. Card inventory is not accumulated; family counts are derived from successful decision history.

| Family | Perk | Rule |
| --- | --- | --- |
| Technology | Engineering network | Future technology cards cost 1 less, minimum cost 1 |
| Politics | Strong mandate | All future policies gain 8 approval points |
| Economics | Patient capital | Add 1 credit to each new-turn income |
| Justice | Social compact | No support decay; rejected cards refund 90%, rounded down |
| Awareness | Informed public | All future policies gain 5 approval points |
| Nature | Living landscapes | Future nature cards gain 3 base transition points before the time bonus |

Cost, odds and effects for the unlocking card use the pre-play perks. Economics income and justice decay benefits activate immediately at the subsequent between-turn step. Newly unlocked perks are recorded in the turn receipt.

In 2050 (round index 2), Public Spotlight adds 6 approval points to politics, justice and awareness cards. In 2080 (round index 5), Supply Squeeze adds 1 credit to technology costs unless economy is at least 75. These events are shared across all runs, do not introduce additional random penalties, and are visible before committing.

One free redraw per run replaces the three offers without consuming the decade, modifying resources, or adding history. It increments the server revision, uses the same ownership and idempotency checks, and cannot be repeated. Existing offers are excluded when enough other eligible cards exist. Later offers use the redraw-adjusted random salt. There is no undo after a committed policy.

Saving adds 2 bonus credits and, unless it is the final turn, the usual next-turn income. Economy, support, awareness and justice are bounded to 0–100. Coal phase-out is a card-specific trade-off, not a claim that climate action necessarily reduces growth. A previously successful worker-transition card halves its support and economy penalties. A successful coalition unlocks the international-deal card.

### Transition and scores

Each accepted card's transition delta receives an early-action multiplier of `1 + (6 - roundIndex) * 0.06`, rounded to the nearest point. Politics, education and adaptation do not automatically generate transition points. The pressure index is `max(0, round(100 - transition))`, simply a game metric.

Score out of 1000: `6*clamp(transition,0,100) + 2*justice + support + economy`, rounded. Leaderboard ties share ranks; completion time only orders tied entries visually. Random offers and rolls vary, so this version is exploratory and must not be used for prize-bearing competition without fairness review.

### Historical balance review priorities

Review whether seven rounds allow enough value from enabling cards, whether support bonuses are stronger than immediate mitigation, whether saving is worthwhile, and whether RNG dominates a short run. Test challenge seeds, guaranteed baseline outcomes or bounded setbacks before adding minigames. Additional mechanistic complexity is not yet needed.
