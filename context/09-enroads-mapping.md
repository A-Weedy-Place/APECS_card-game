# En-ROADS input mapping review — 2026-10-13

The user changed the premise to ten policy-planning rounds conducted in **2026**, with multiple policies affordable within a round. The rounds represent opportunities to negotiate a package, not elapsed decades. The physical scenario is evaluated later, potentially through 2100. Earlier saved versions keep their own rules; do not relabel those histories.

## What is connected

`src/game/climate-levers.ts` supplies documented control names, units, ranges, timings, source links and **designer-selected policy targets** for 21 existing cards. It merges overlapping targets for a future combined scenario. It does **not** run En-ROADS, calculate emissions, predict temperature, or validate the game's score/social mechanics. No En-ROADS SDK or public API has been installed or invoked.

The documentation is adapted with attribution to Climate Interactive. En-ROADS is a tool created by [Climate Interactive](https://www.climateinteractive.org/) and [MIT Sloan](https://mitsloan.mit.edu/). Card mappings, targets and game rules are the project's additions; no endorsement is implied.

## Verified access and timing

Official [use and citation guidance](https://support.climateinteractive.org/support/solutions/articles/47001266571-how-to-use-and-cite-en-roads-and-c-roads), updated 2026-04-29, says the online simulator is free to use, documentation/support materials are CC BY 4.0, and separate commercial or noncommercial SDK licences are available by contacting Climate Interactive. An integration must obtain suitable access and terms; a free website is not evidence of a redistributable SDK or public API. No organization was contacted. The [partnership page](https://www.climateinteractive.org/partner-with-us/) also describes licensed SDK/software integration.

The [current guide](https://docs.climateinteractive.org/projects/en-roads/en/latest/) is marked August 2026. Browser inspection of the [official simulator](https://en-roads.climateinteractive.org/scenario.html?v=26.9.0) confirmed **v26.9.0**, last updated September 2, 2026. This matters: some old PDF snippets use dollars/kWh where the current energy supply controls use percentage price adjustments.

The inspected start-year controls have a **2027 minimum**, including coal, renewable subsidies, carbon price, buildings efficiency/electrification, agricultural practices, waste/leakage, forest restoration and DACCS. Consequently metadata distinguishes `adoptionYear: 2026` from `modelStartYear: 2027`. All cards are proposed/adopted in the same planning year. Do not silently force 2026 into a model that cannot accept it. A different authorised model version would need another timing review.

Adoption is not immediate implementation. The [dynamics guide](https://docs.climateinteractive.org/projects/en-roads/en/latest/guide/background.html) explains infrastructure turnover, construction and response delays. Renewable and nuclear subsidy guides describe ten-year phase-in; agriculture and waste/leakage default to 30-year implementation. Forest restoration retains separate land-access and planting times. Game rounds must never change these dates merely because a card appeared later in the hand.

## Card targets and official controls

Every target below is an explicit game scenario choice **within a verified input range**, not Climate Interactive's recommended policy, measured card effectiveness, cost estimate or temperature result. Country flags identify players; these targets describe a global aggregate scenario, not a country's NDC.

| Card(s) | Proposed control target | Verified range, unit and timing | Source |
| --- | --- | --- | --- |
| Solar / wind / community power | Net renewable subsidy 50% / 60% / 40% (input −50/−60/−40) | −100 to +50% of levelized cost; baseline −25%; ten-year phase-in from 2027 | [Renewables](https://docs.climateinteractive.org/projects/en-roads/en/latest/guide/renewables.html) |
| Firm clean power | Nuclear net subsidy 60% (input −60) | −100 to +50% of levelized cost; baseline −30%; ten-year phase-in | [Nuclear](https://docs.climateinteractive.org/projects/en-roads/en/latest/guide/nuclear.html) |
| Retire coal | Restrict new infrastructure 100%; accelerate retirement 5%/year | Detailed sliders 0–100% and 0–10%/year; start 2027. Existing stock does not disappear immediately | [Coal](https://docs.climateinteractive.org/projects/en-roads/en/latest/guide/coal.html), [v26.9 UI](https://en-roads.climateinteractive.org/scenario.html?v=26.9.0) |
| Clean-power standard | 90% qualifying electricity; renewables and nuclear qualify | Target 60–100%; baseline switch is off. 15-year phase-in (allowed 5–40). Set source checkboxes explicitly; exclude biomass/fossil CCS in this scenario | [Carbon price/standards](https://docs.climateinteractive.org/projects/en-roads/en/latest/guide/carbonprice.html), live UI |
| Use less energy / retrofit wave / circular materials | Buildings/industry efficiency 2 / 3 / 2.5% per year | 0–3%/year; baseline 1.2%; annual improvement in new capital's energy intensity, not an immediate economy-wide emissions cut | [Buildings efficiency](https://docs.climateinteractive.org/projects/en-roads/en/latest/guide/buildings_ee.html) |
| Clean heat / cleaner steel & cement | Electric-equipment subsidy 25% / 35% | 0–50% of purchase cost; baseline 0%; starts 2027, physical deployment follows model dynamics | [Buildings electrification](https://docs.climateinteractive.org/projects/en-roads/en/latest/guide/buildings_elec.html) |
| Clean public transit | Transport efficiency 2% per year | 0–3%/year; baseline 0.5%; aggregate new-capital intensity, not a public-transit-only control | [Transport efficiency](https://docs.climateinteractive.org/projects/en-roads/en/latest/guide/transport_ee.html) |
| Clean public transit | Electric transport subsidy 25% | 0–50% purchase cost with charging infrastructure; baseline 7%. Road/rail only; **not shipping/aviation** | [Transport electrification](https://docs.climateinteractive.org/projects/en-roads/en/latest/guide/transport_elec.html) |
| Find & fix leaks / methane standards | Energy-system methane 50% / 80% of reduction potential | Detailed control 0–100%; 30-year ramp (10–60 allowed). Not the combined slider for waste, industry and refrigerants | [Waste/leakage](https://docs.climateinteractive.org/projects/en-roads/en/latest/guide/waste.html), live UI |
| Cleaner steel & cement / circular materials | Industrial-process CO₂ 40% / 70% of reduction potential | Detailed v26.9 control 0–100%; same waste/leakage timing, distinct from combustion emissions | [v26.9 UI](https://en-roads.climateinteractive.org/scenario.html?v=26.9.0) |
| Keep forests standing | Deforestation/degradation trend −5%/year | −10 to +1%/year; baseline 0%; annual trend, not percentage of all forest cover | [Deforestation](https://docs.climateinteractive.org/projects/en-roads/en/latest/guide/deforestation.html) |
| Restore landscapes | 30% of model-available land for afforestation/reforestation | 0–100%; default available land 550 Mha. Retain separate 10-year land-access and 10-year planting controls; tree growth follows | [Nature removal](https://docs.climateinteractive.org/projects/en-roads/en/latest/guide/nature_based_removal.html), live UI |
| Waste less food | Food waste reaches 15% of food produced in 2100 | 10–40%; baseline 30%; starts 2027. This is the final wasted share, **not a 15% reduction** | [Agriculture/food](https://docs.climateinteractive.org/projects/en-roads/en/latest/guide/ag_emissions.html), live UI |
| Resilient farming / regenerative food networks | Agricultural best practices 40% / 70% of reduction potential | 0–100% in current UI; 30-year ramp (10–60 allowed). Does not eliminate unavoidable agricultural emissions | [Agriculture/food](https://docs.climateinteractive.org/projects/en-roads/en/latest/guide/ag_emissions.html), live UI |
| Monitored removals | DACCS payment $300/ton captured | $0–1000/ton; starts 2027. A price/revenue input, **not** a quantity of removal. Actual capacity and net removal remain model outputs | [Technological removal](https://docs.climateinteractive.org/projects/en-roads/en/latest/guide/tech_removal.html), live UI |
| Polluters pay | Initial carbon price $100/ton CO₂ | $0–250/ton, baseline $5; phase in 10 years (1–100 allowed); energy CO₂. Final price and eligibility switches need explicit retention/setting | [Carbon pricing](https://docs.climateinteractive.org/projects/en-roads/en/latest/guide/carbonprice.html), live UI |

The live waste/agriculture controls are **0–100%**, despite guide tables retaining a −10% increased-emissions category. Use the inspected version's actual permitted values. Main Nature-Based Removal also controls soil and biochar, so the forest card uses the specific land slider instead. Main Waste and Leakage also affects other gases, so methane repair uses only the energy-leakage subcontrol. The clean-industry card has an explicit process-CO₂ input, verified in live v26.9 even though the current guide's summary does not yet list it.

## What is deliberately unmapped

The model offers broader energy, demand, agriculture, land, removal and growth options. Oil, natural gas, bioenergy, new zero-carbon supply, hydrogen, F-gases, population and exogenous GDP are not automatically changed by existing cards. In particular, the game's economy bar must **not** become the En-ROADS GDP slider: they represent different things and no calibration supports such a conversion.

Politics, awareness, justice, education, participation, access, training and finance are enabling game mechanics. Adaptation, early warning, loss-and-damage, coastal protection and solidarity protect people or improve distribution; they have no automatic temperature reduction. Rights are not a numerical technology. A climate pact must specify physical policies rather than add another copy of their climate benefits.

The grid card is not mapped to an invented storage breakthrough. The wetland card is not forced into a forest, biochar or soil slider. Clean freight is not mapped to a global transport or road/rail control; its maritime/fuel/logistics mixture needs more specification. These require a separate quantitative mapping review. Metadata gives the reason instead of silently inventing a model input. Broad cards such as heat, transit and circular materials use global aggregate proxies, with card-specific caveats; those mappings remain assumptions requiring expert review before a scientific release.

## Combination rules and gameplay consequences

`combineClimateLevers(acceptedCardIds)` keeps one strongest setting per lever: solar −50 plus wind −60 means −60%, not −110%; efficiency 2 then 3% means 3%, not 5%; methane 50 then 80% means 80%, not 130%. It is order-independent for the present catalogue. “Stronger” means more ambitious policy input, not a guarantee of a monotonic temperature effect. This is a transparent game scenario assembly rule, not a substitute for the actual model's interactions. Rejected cards supply no inputs.

Clean electricity complements electrification; energy efficiency reduces demand; methane controls address a different gas/source; forests and food compete for and depend on land; fossil-price changes interact with renewable subsidies. Source documentation supports these qualitative relationships, **not** the numeric synergy bonuses in the game. Do not add one-card temperature differences together. Do not call money/support/justice values model-derived.

Useful mechanics follow from the distinction: building a diversified package can be more useful than buying overlapping promises; an upgrade can strengthen an already selected target; enablers can fund or improve implementation without claiming a separate cooling effect. Within-round combinations can unlock prerequisites in the same 2026 negotiating session. A late planning-round card must not lose climate effectiveness because the UI previously called that round 2090.

## Requirements before displaying temperature

Obtain authorised SDK/service access or a validated set of published/precomputed complete scenarios. Pin the model version and baseline. Translate every mapped control, start year, stop year, ramp and qualifying-source switch. Resolve broad proxies and unmapped mitigation cards. Evaluate the **whole package**; compare against official manual scenarios and record model outputs separately from game scores. An initial $100 carbon price plus a later final-price default must not accidentally drop the policy. Cache equivalent physical input packages, not the order of game clicks.

Only then expose 2100 temperature and, for the pavilion's overshoot theme, peak warming/time above a threshold from that same run. Until then the game may display policy targets and illustrative transition points, but it must not claim a future-temperature calculation. Current metadata is useful groundwork, not completed scientific integration.

## Verified versus pending

Verified: primary guide pages, official use/licensing FAQ, public v26.9 control values and visible DOM slider bounds; start-year minimum; detailed subcontrol scope; supplied metadata's ranges/combination semantics. No model resources were reverse engineered, no API endpoints guessed, no contacts made and no licensed software redistributed.

Pending: licensed runtime access, complete version-pinned export schema, independent scientific mapping review, full-scenario comparison and uncertainty treatment. UI/engine integration and project-wide tests are recorded separately in Progress by the parent implementation task.
