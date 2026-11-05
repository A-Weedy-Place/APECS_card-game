# APECS card guide

Current game **0.10** · **67 cards** · En-ROADS **26.10.0** · Updated 5 November 2026.

Each box is a card. An arrow means **the first card must pass before the next card can appear**. Cards without an incoming arrow have no card prerequisite. Unlocking makes a card eligible for a later random hand.

The price shown is the cost of that card alone. Upgrading requires paying for each stage along the way. For example, a 5 → 8 → 11 path costs 24 coins in total.

## Contents

- [Energy — fuels and pricing](#section-1)
- [Energy — clean power and carbon price](#section-2)
- [Demand — efficiency and electrification](#section-3)
- [Growth — population and economic scenarios](#section-4)
- [Removal](#section-5)
- [Land and gases](#section-6)
- [Support cards](#support-cards)
- [How the paths interact](#how-the-paths-interact)

## Reading the effects

- **Revenue** means the game resource called Revenue growth.
- **Politics** means political support, which has the strongest effect on approval.
- **Engagement** means public engagement, which gives a smaller approval boost.
- A pair such as **Politics −10 / −8** means **below 60 engagement / at least 60 engagement**. These are the full effects of an accepted card, including its political effort.
- The eight ordinary support cards have a 100% approval rate. Policy cards and the election wildcard use the current game state to calculate their approval.
- Ordinary rejected cards refund half their cost, rounded down, and lose 4 politics. The election wildcard has its own rejection rule below.

Targets in the tables are absolute En-ROADS settings. A later accepted card for the same control replaces the previous setting. Temperature is calculated from the complete 19-control package.

<a id="section-1"></a>

## Energy — fuels and pricing

```mermaid
flowchart LR
  subgraph path_coal["Coal"]
    direction LR
    coal_main_1["End coal subsidies<br/>5 coins"]
    coal_main_2["Coal price reform<br/>8 coins"]
    coal_main_3["Strong coal tax<br/>11 coins"]
    coal_main_1 --> coal_main_2
    coal_main_2 --> coal_main_3
  end
  subgraph path_oil["Oil"]
    direction LR
    oil_main_1["Oil demand reform<br/>5 coins"]
    oil_main_2["Oil price signal<br/>8 coins"]
    oil_main_3["Strong oil tax<br/>11 coins"]
    oil_main_1 --> oil_main_2
    oil_main_2 --> oil_main_3
  end
  subgraph path_gas["Natural Gas"]
    direction LR
    gas_main_1["End gas subsidies<br/>5 coins"]
    gas_main_2["Gas price reform<br/>8 coins"]
    gas_main_3["Strong gas tax<br/>11 coins"]
    gas_main_1 --> gas_main_2
    gas_main_2 --> gas_main_3
  end
  subgraph path_bioenergy["Bioenergy"]
    direction LR
    bioenergy_main_1["Bioenergy reform<br/>5 coins"]
    bioenergy_main_2["Limit bioenergy subsidies<br/>8 coins"]
    bioenergy_main_3["Strong bioenergy tax<br/>11 coins"]
    bioenergy_main_1 --> bioenergy_main_2
    bioenergy_main_2 --> bioenergy_main_3
  end
```

### Coal

| Card | Coins | Model target | Buffs and debuffs when passed |
| --- | ---: | --- | --- |
| End coal subsidies | 5 | 0% net tax | Politics −10 / −8 |
| Coal price reform | 8 | 75% net tax | Politics −14 / −12 |
| Strong coal tax | 11 | 160% net tax | Politics −18 / −16 |

### Oil

| Card | Coins | Model target | Buffs and debuffs when passed |
| --- | ---: | --- | --- |
| Oil demand reform | 5 | 50% net tax | Politics −10 / −8 |
| Oil price signal | 8 | 100% net tax | Politics −14 / −12 |
| Strong oil tax | 11 | 180% net tax | Politics −18 / −16 |

### Natural Gas

| Card | Coins | Model target | Buffs and debuffs when passed |
| --- | ---: | --- | --- |
| End gas subsidies | 5 | 0% net tax | Politics −10 / −8 |
| Gas price reform | 8 | 75% net tax | Politics −14 / −12 |
| Strong gas tax | 11 | 160% net tax | Politics −18 / −16 |

### Bioenergy

| Card | Coins | Model target | Buffs and debuffs when passed |
| --- | ---: | --- | --- |
| Bioenergy reform | 5 | 0% net tax | Politics −10 / −8 |
| Limit bioenergy subsidies | 8 | 70% net tax | Politics −14 / −12 |
| Strong bioenergy tax | 11 | 150% net tax | Politics −18 / −16 |

<a id="section-2"></a>

## Energy — clean power and carbon price

```mermaid
flowchart LR
  subgraph path_renewables["Renewables"]
    direction LR
    renewables_main_1["Renewable support<br/>5 coins"]
    renewables_main_2["Scale clean power<br/>8 coins"]
    renewables_main_3["Renewables at scale<br/>11 coins"]
    renewables_main_1 --> renewables_main_2
    renewables_main_2 --> renewables_main_3
  end
  subgraph path_nuclear["Nuclear"]
    direction LR
    nuclear_main_1["Nuclear support<br/>5 coins"]
    nuclear_main_2["Firm power programme<br/>8 coins"]
    nuclear_main_3["Nuclear build-out<br/>11 coins"]
    nuclear_main_1 --> nuclear_main_2
    nuclear_main_2 --> nuclear_main_3
  end
  subgraph path_new_zero["New Zero-Carbon"]
    direction LR
    new_zero_main_1["Energy breakthrough<br/>9 coins"]
    new_zero_main_2["Huge breakthrough<br/>14 coins"]
    new_zero_main_1 --> new_zero_main_2
  end
  subgraph path_carbon_price["Carbon Price"]
    direction LR
    carbon_price_main_1["Carbon price: low<br/>5 coins"]
    carbon_price_main_2["Carbon price: medium<br/>8 coins"]
    carbon_price_main_3["Carbon price: high<br/>11 coins"]
    carbon_price_main_1 --> carbon_price_main_2
    carbon_price_main_2 --> carbon_price_main_3
  end
```

### Renewables

| Card | Coins | Model target | Buffs and debuffs when passed |
| --- | ---: | --- | --- |
| Renewable support | 5 | 40% subsidy | Politics −10 / −8 |
| Scale clean power | 8 | 65% subsidy | Politics −14 / −12 |
| Renewables at scale | 11 | 90% subsidy | Politics −18 / −16 |

### Nuclear

| Card | Coins | Model target | Buffs and debuffs when passed |
| --- | ---: | --- | --- |
| Nuclear support | 5 | 45% subsidy | Politics −10 / −8 |
| Firm power programme | 8 | 70% subsidy | Politics −14 / −12 |
| Nuclear build-out | 11 | 95% subsidy | Politics −18 / −16 |

### New Zero-Carbon

| Card | Coins | Model target | Buffs and debuffs when passed |
| --- | ---: | --- | --- |
| Energy breakthrough | 9 | Breakthrough | Politics −10 / −8 |
| Huge breakthrough | 14 | Huge breakthrough | Politics −14 / −12 |

### Carbon Price

| Card | Coins | Model target | Buffs and debuffs when passed |
| --- | ---: | --- | --- |
| Carbon price: low | 5 | $20/t CO₂ | Politics −10 / −8 |
| Carbon price: medium | 8 | $60/t CO₂ | Politics −14 / −12 |
| Carbon price: high | 11 | $100/t CO₂ | Politics −18 / −16 |

<a id="section-3"></a>

## Demand — efficiency and electrification

```mermaid
flowchart LR
  subgraph path_transport_efficiency["Transport Efficiency"]
    direction LR
    transport_efficiency_main_1["Efficient transport<br/>5 coins"]
    transport_efficiency_main_2["Transport standards<br/>8 coins"]
    transport_efficiency_main_3["High-efficiency fleets<br/>11 coins"]
    transport_efficiency_main_1 --> transport_efficiency_main_2
    transport_efficiency_main_2 --> transport_efficiency_main_3
  end
  subgraph path_transport_electric["Transport Electrification"]
    direction LR
    transport_electric_main_1["Electric mobility<br/>5 coins"]
    transport_electric_main_2["EV infrastructure<br/>8 coins"]
    transport_electric_main_3["Electrified transport<br/>11 coins"]
    transport_electric_main_1 --> transport_electric_main_2
    transport_electric_main_2 --> transport_electric_main_3
  end
  subgraph path_buildings_efficiency["Buildings &amp; Industry Efficiency"]
    direction LR
    buildings_efficiency_main_1["Efficient buildings<br/>5 coins"]
    buildings_efficiency_main_2["Retrofit programme<br/>8 coins"]
    buildings_efficiency_main_3["Deep efficiency<br/>11 coins"]
    buildings_efficiency_main_1 --> buildings_efficiency_main_2
    buildings_efficiency_main_2 --> buildings_efficiency_main_3
  end
  subgraph path_buildings_electric["Buildings &amp; Industry Electrification"]
    direction LR
    buildings_electric_main_1["Clean heat grants<br/>5 coins"]
    buildings_electric_main_2["Industry electrifies<br/>8 coins"]
    buildings_electric_main_3["Electric equipment<br/>11 coins"]
    buildings_electric_main_1 --> buildings_electric_main_2
    buildings_electric_main_2 --> buildings_electric_main_3
  end
```

### Transport Efficiency

| Card | Coins | Model target | Buffs and debuffs when passed |
| --- | ---: | --- | --- |
| Efficient transport | 5 | 1.5%/year efficiency | Politics −10 / −8 |
| Transport standards | 8 | 2.2%/year efficiency | Politics −14 / −12 |
| High-efficiency fleets | 11 | 3%/year efficiency | Politics −18 / −16 |

### Transport Electrification

| Card | Coins | Model target | Buffs and debuffs when passed |
| --- | ---: | --- | --- |
| Electric mobility | 5 | 20% purchase subsidy | Politics −10 / −8 |
| EV infrastructure | 8 | 35% purchase subsidy | Politics −14 / −12 |
| Electrified transport | 11 | 50% purchase subsidy | Politics −18 / −16 |

### Buildings & Industry Efficiency

| Card | Coins | Model target | Buffs and debuffs when passed |
| --- | ---: | --- | --- |
| Efficient buildings | 5 | 1.8%/year efficiency | Politics −10 / −8 |
| Retrofit programme | 8 | 2.4%/year efficiency | Politics −14 / −12 |
| Deep efficiency | 11 | 3%/year efficiency | Politics −18 / −16 |

### Buildings & Industry Electrification

| Card | Coins | Model target | Buffs and debuffs when passed |
| --- | ---: | --- | --- |
| Clean heat grants | 5 | 15% purchase subsidy | Politics −10 / −8 |
| Industry electrifies | 8 | 30% purchase subsidy | Politics −14 / −12 |
| Electric equipment | 11 | 50% purchase subsidy | Politics −18 / −16 |

<a id="section-4"></a>

## Growth — population and economic scenarios

```mermaid
flowchart LR
  subgraph path_population["Population"]
    direction LR
    population_low_1["Low population growth<br/>6 coins"]
    population_low_2["Lowest population growth<br/>10 coins"]
    population_high_1["High population growth<br/>4 coins"]
    population_high_2["Highest population growth<br/>7 coins"]
    population_low_1 --> population_low_2
    population_high_1 --> population_high_2
  end
  subgraph path_gdp["Economic Growth"]
    direction LR
    gdp_low_1["Low consumption growth<br/>5 coins"]
    gdp_low_2["Lowest consumption growth<br/>8 coins"]
    gdp_high_1["High economic growth<br/>5 coins"]
    gdp_high_2["Highest economic growth<br/>8 coins"]
    gdp_low_1 --> gdp_low_2
    gdp_high_1 --> gdp_high_2
  end
```

### Population

| Card | Coins | Model target | Buffs and debuffs when passed |
| --- | ---: | --- | --- |
| Low population growth | 6 | 9.7bn in 2100 | Politics −9 / −7; Engagement +4 |
| Lowest population growth | 10 | 9.1bn in 2100 | Politics −11 / −9; Engagement +4 |
| High population growth | 4 | 10.8bn in 2100 | Politics −9 / −7 |
| Highest population growth | 7 | 11.3bn in 2100 | Politics −11 / −9 |

### Economic Growth

| Card | Coins | Model target | Buffs and debuffs when passed |
| --- | ---: | --- | --- |
| Low consumption growth | 5 | 1% GDP/person growth | Revenue −9; Politics −14 / −12 |
| Lowest consumption growth | 8 | 0.5% GDP/person growth | Revenue −9; Politics −16 / −14 |
| High economic growth | 5 | 2% GDP/person growth | Revenue +9; Politics −3 / −1 |
| Highest economic growth | 8 | 2.5% GDP/person growth | Revenue +9; Politics −5 / −3 |

Population and GDP cards explore scenario assumptions. Low and high are separate branches. A stage-two card also requires its own stage-one target to be the currently active setting. A stage-one card can switch the active branch. After switching, the earlier branch's upgrade stays locked while its first-stage setting is inactive. Already adopted stage-one cards cannot be replayed.

<a id="section-5"></a>

## Removal

```mermaid
flowchart LR
  subgraph path_nature_removal["Nature-Based Removal"]
    direction LR
    nature_removal_main_1["Nature removal: low<br/>5 coins"]
    nature_removal_main_2["Nature removal: medium<br/>8 coins"]
    nature_removal_main_3["Nature removal: high<br/>11 coins"]
    nature_removal_main_1 --> nature_removal_main_2
    nature_removal_main_2 --> nature_removal_main_3
  end
  subgraph path_tech_removal["Technological Removal"]
    direction LR
    tech_removal_main_1["Removal research<br/>5 coins"]
    tech_removal_main_2["Removal scale-up<br/>8 coins"]
    tech_removal_main_3["Removal deployment<br/>11 coins"]
    tech_removal_main_1 --> tech_removal_main_2
    tech_removal_main_2 --> tech_removal_main_3
  end
```

### Nature-Based Removal

| Card | Coins | Model target | Buffs and debuffs when passed |
| --- | ---: | --- | --- |
| Nature removal: low | 5 | 25% of potential | Politics −10 / −8 |
| Nature removal: medium | 8 | 55% of potential | Politics −14 / −12 |
| Nature removal: high | 11 | 85% of potential | Politics −18 / −16 |

### Technological Removal

| Card | Coins | Model target | Buffs and debuffs when passed |
| --- | ---: | --- | --- |
| Removal research | 5 | 25% of potential | Politics −10 / −8 |
| Removal scale-up | 8 | 55% of potential | Politics −14 / −12 |
| Removal deployment | 11 | 85% of potential | Politics −18 / −16 |

<a id="section-6"></a>

## Land and gases

```mermaid
flowchart LR
  subgraph path_agriculture["Agricultural Emissions"]
    direction LR
    agriculture_main_1["Farm emissions plan<br/>5 coins"]
    agriculture_main_2["Food-system programme<br/>8 coins"]
    agriculture_main_3["Agriculture transformation<br/>11 coins"]
    agriculture_main_1 --> agriculture_main_2
    agriculture_main_2 --> agriculture_main_3
  end
  subgraph path_waste["Waste and Leakage"]
    direction LR
    waste_main_1["Leak &amp; waste controls<br/>5 coins"]
    waste_main_2["Waste-system overhaul<br/>8 coins"]
    waste_main_3["Deep leakage cuts<br/>11 coins"]
    waste_main_1 --> waste_main_2
    waste_main_2 --> waste_main_3
  end
  subgraph path_deforestation["Deforestation"]
    direction LR
    deforestation_main_1["Slow forest loss<br/>5 coins"]
    deforestation_main_2["Protect standing forests<br/>8 coins"]
    deforestation_main_3["End forest-loss pressure<br/>11 coins"]
    deforestation_main_1 --> deforestation_main_2
    deforestation_main_2 --> deforestation_main_3
  end
```

### Agricultural Emissions

| Card | Coins | Model target | Buffs and debuffs when passed |
| --- | ---: | --- | --- |
| Farm emissions plan | 5 | 30% of potential | Politics −10 / −8 |
| Food-system programme | 8 | 60% of potential | Politics −14 / −12 |
| Agriculture transformation | 11 | 90% of potential | Politics −18 / −16 |

### Waste and Leakage

| Card | Coins | Model target | Buffs and debuffs when passed |
| --- | ---: | --- | --- |
| Leak & waste controls | 5 | 30% of potential | Politics −10 / −8 |
| Waste-system overhaul | 8 | 60% of potential | Politics −14 / −12 |
| Deep leakage cuts | 11 | 90% of potential | Politics −18 / −16 |

### Deforestation

| Card | Coins | Model target | Buffs and debuffs when passed |
| --- | ---: | --- | --- |
| Slow forest loss | 5 | -2%/year forest-loss trend | Politics −10 / −8 |
| Protect standing forests | 8 | -5%/year forest-loss trend | Politics −14 / −12 |
| End forest-loss pressure | 11 | -9%/year forest-loss trend | Politics −18 / −16 |

## Support cards

```mermaid
flowchart LR
  subgraph support_politics["Politics"]
    direction LR
    coalition_v9["Build a coalition<br/>4 coins"]
    assembly_v9["Cross-party agreement<br/>7 coins"]
    mandate_v9["Win an election mandate<br/>18 coins · RARE"]
    coalition_v9 --> assembly_v9
    coalition_v9 --> mandate_v9
  end
  subgraph support_awareness["Public engagement"]
    direction LR
    listen_v9["Community dialogue<br/>3 coins"]
    fair_v9["Fair transition<br/>5 coins"]
    participate_v9["Inclusive decisions<br/>6 coins"]
    access_v9["Public services<br/>4 coins"]
    listen_v9 --> participate_v9
  end
  subgraph support_economics["Revenue growth"]
    direction LR
    revenue_v9["Revenue programme<br/>4 coins"]
    finance_v9["Long-term finance<br/>7 coins"]
    revenue_v9 --> finance_v9
  end
```

| Card | Coins | Buffs when passed | Repeatable? |
| --- | ---: | --- | --- |
| Build a coalition | 4 | Politics +20 | Yes |
| Cross-party agreement | 7 | Politics +30; Engagement +4 | No |
| Community dialogue | 3 | Politics +6; Engagement +18 | Yes |
| Fair transition | 5 | Politics +12; Engagement +16 | Yes |
| Inclusive decisions | 6 | Politics +10; Engagement +24 | No |
| Revenue programme | 4 | Revenue +18 | Yes |
| Long-term finance | 7 | Revenue +26; Politics −4 | No |
| Public services | 4 | Revenue +5; Engagement +12 | Yes |
| Win an election mandate | 18 | Politics +20; election mandate | No |

**Win an election mandate** branches directly from **Build a coalition**. It can pass without Cross-party agreement. It costs 18 coins and appears as a rare offer. Passing raises later ordinary policy approval to 96–99%. Rejection refunds 4 coins and loses 15 politics.

## How the paths interact

The solid arrows in the card diagrams are the actual unlock requirements. The dashed arrows below show resource benefits.

```mermaid
flowchart TD
  Revenue["Revenue programme / Long-term finance"] -.-> Income["More coins each round"]
  Income -.-> Purchase["Afford more cards and upgrades"]
  Coalition["Coalition / Cross-party agreement"] -.-> Politics["More political support"]
  Dialogue["Dialogue / Fair transition / Inclusive decisions"] -.-> Engagement["More public engagement"]
  Politics -.-> Approval["Better policy approval"]
  Engagement -.-> Approval
  Engagement -.-> Effort["At 60+, reduce political effort"]
  Purchase -.-> Adoption["Pass policies to set model controls"]
  Approval -.-> Adoption
  Adoption -.-> Temperature["Complete En-ROADS scenario gives the 2100 temperature"]
```

Revenue funds all pathways. Politics and public engagement improve the chance of passing them. Support cards affect these game resources. Their climate effect comes through the model policies they help the player adopt.

The main model paths have no cross-path card prerequisites. For example, Electric mobility can be offered before Renewable support. Their combined climate effects are handled by En-ROADS.

## Costs and game limits

- Start with **8 coins** and hold at most **20**.
- Income follows **3 + floor(Revenue / 25)** coins per round. Revenue ranges from 0 to 100, giving **3–7 coins per round** under the current rules. The starting value gives **5**. Available bank space limits what can be collected.
- Play up to **three offered cards** together when the combined cost is affordable. Each receives its own verdict.
- Prerequisites must have passed in an earlier round. A parent and its upgrade cannot be unlocked together in one package.
- Shuffle costs **1, then 2, then 3… coins** within the same round. Settling the round resets the price.
- Skip carries saved coins into the next round and receives the usual round income. The final round ends the game.
- Arcade rounds **4 and 7** award up to **5 extra coins** each, limited by remaining bank space.

All costs, resource effects, approval rules and card-to-control target choices are game design assumptions. Population and GDP are model scenario assumptions. Whole-scenario En-ROADS evaluation supplies the final temperature.

Source of card names, costs, targets and links: [policy catalogue](../src/game/policy-catalogue.ts). Resource effects and eligibility: [policy rules](../src/game/v9.ts). Current arcade rewards: [0.10 rules](../src/game/v10.ts).
