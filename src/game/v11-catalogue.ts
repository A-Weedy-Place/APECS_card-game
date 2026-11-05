import { controlFor, defaultSettings, settingLabel, type PolicyCardV9, type PolicySettings } from "./policy-catalogue";
import type { Effects } from "./types";

export type PolicyCardV11 = PolicyCardV9 & { excludes?: string; minStage?: number; riskCard?: boolean };
const cards: PolicyCardV11[] = [];
const note = "En-ROADS 26.11.0 scenario target. Adopted in 2026, with the model's default physical rollout. Costs, social effects and approval odds are game assumptions.";

function policy(factor: string, title: string, target: number, cost: number, photo: string,
  options: { tier?: 1 | 2; requires?: string; effects?: Effects; difficulty?: number; excludes?: string; riskCard?: boolean; description?: string } = {}) {
  const tier = options.tier ?? 1;
  const card: PolicyCardV11 = {
    id: `${factor}-v11-${cards.filter(item => item.factor === factor).length + 1}`,
    title, factor, target, cost, photo, tier, branch: "main", role: "action", category: "technology", pathway: factor,
    phases: ["Foundation", "Momentum", "Transformation"], difficulty: options.difficulty ?? (tier === 2 ? 22 : 12),
    setting: settingLabel(factor, target), effects: options.effects ?? { support: -4 },
    description: options.description ?? `Set ${controlFor(factor).label.toLowerCase()} to ${settingLabel(factor, target)}.`,
    icon: "leaf", note, ...options, minStage: tier === 2 ? 2 : 1,
  };
  cards.push(card);
  return card;
}

function stages(factor: string, titles: [string, string], photos: [string, string], costs: [number, number]) {
  const control = controlFor(factor);
  const midpoint = Math.round((control.baseline + control.max) / 2);
  const first = policy(factor, titles[0], midpoint, costs[0], photos[0]);
  policy(factor, titles[1], control.max, costs[1], photos[1], { tier: 2, requires: first.id, effects: { support: -7 } });
}

stages("coal", ["Coal price reform", "Maximum coal tax"], ["coal-mine", "clean-industry"], [6, 10]);
stages("oil", ["Oil price reform", "Maximum oil tax"], ["oil-pump", "oil-refinery"], [7, 11]);
stages("gas", ["Gas price reform", "Maximum gas tax"], ["gas-plant", "lng-terminal"], [6, 10]);
stages("bioenergy", ["Bioenergy price reform", "Maximum bioenergy tax"], ["biogas", "biomass"], [5, 8]);
policy("renewables", "Accelerate renewables", -100, 8, "solar", { effects: { support: -3, economy: 3 } });
const nuclearSupport = policy("nuclear", "Encourage nuclear", -100, 7, "nuclear-build", { difficulty: 18, effects: { support: -8 } });
const nuclearLimit = policy("nuclear", "Discourage nuclear", 50, 5, "nuclear-control", { difficulty: 12, effects: { support: 5, economy: -4 } });
nuclearSupport.excludes = nuclearLimit.id;
nuclearLimit.excludes = nuclearSupport.id;
nuclearSupport.branch = "encourage";
nuclearLimit.branch = "discourage";
const zero = policy("new-zero", "Energy breakthrough", 1, 10, "innovation-fund", { difficulty: 16 });
policy("new-zero", "Huge energy breakthrough", 2, 15, "skills-training", { tier: 2, requires: zero.id, difficulty: 26 });
stages("carbon-price", ["High carbon price", "Maximum carbon price"], ["carbon-price", "international-deal"], [7, 12]);

policy("transport-efficiency", "High-efficiency transport", 3, 7, "clean-transit", { effects: { support: -3 } });
policy("transport-electric", "Electrify transport", 50, 8, "electric-car", { effects: { support: -5 } });
policy("buildings-efficiency", "Deep building efficiency", 3, 7, "deep-retrofit", { effects: { support: -3 } });
policy("buildings-electric", "Electrify buildings & industry", 50, 8, "heat", { effects: { support: -5 } });
policy("population", "Lowest population scenario", 9, 6, "population-history", {
  riskCard: true, difficulty: 28, effects: { awareness: -45, support: -35 },
  description: "Explore the model's lowest population assumption. Historical coercive population policy illustrates the rights and trust risks. The model does not establish that a particular policy produces this outcome.",
});
policy("gdp", "Lowest consumption growth", 0.5, 6, "social-dividend", {
  riskCard: true, difficulty: 25, effects: { economy: -40, support: -30 },
  description: "Explore the lowest GDP-per-person growth assumption. In the game it sharply cuts revenue and political support.",
});
policy("nature-removal", "Scale nature-based removal", 100, 9, "afforestation", { effects: { support: -6 } });
policy("tech-removal", "Scale technological removal", 100, 12, "capture-plant", { difficulty: 24, effects: { support: -7 } });
policy("agriculture", "Transform agricultural emissions", 100, 7, "agroecology", { effects: { support: -7 } });
policy("waste", "Curtail waste & leakage", 100, 7, "landfill", { effects: { support: -4 } });
policy("deforestation", "End forest-loss pressure", -10, 8, "forest-protection", { effects: { support: -6 } });

function support(id: string, title: string, category: "economics" | "awareness" | "politics", cost: number,
  effects: Effects, photo: string, requires?: string, rare = false): PolicyCardV11 {
  const card: PolicyCardV11 = {
    id: `${id}-v11`, title, category, cost, effects, photo, ...(requires?{requires}:{}),
    setting: category === "economics" ? "Revenue growth" : category === "politics" ? "Political support" : "Public engagement",
    difficulty: rare ? 24 : 0, role: rare ? "action" : "enabler", tier: requires ? 2 : 1,
    phases: ["Foundation", "Momentum", "Transformation"], repeatable: !requires,
    description: "Build the resources needed to deliver your policy programme.", icon: "people",
    note: "Game resource effects and acceptance odds are design assumptions. This card has no direct En-ROADS input.",
    ...(rare ? { rarity: "rare" as const } : {}),
  };
  cards.push(card);
  return card;
}

const revenue = support("revenue", "Revenue programme", "economics", 4, { economy: 18 }, "resilience-fund");
support("finance", "Long-term finance", "economics", 7, { economy: 26, support: -4 }, "loss-damage", revenue.id);
support("finance-breakthrough", "Climate finance breakthrough", "economics", 12, { economy: 45, credits: 8 }, "green-bank", revenue.id, true);
const dialogue = support("dialogue", "Community dialogue", "awareness", 3, { awareness: 18, support: 5 }, "participatory-budget");
support("fair-transition", "Fair transition", "awareness", 6, { awareness: 24, support: 12 }, "worker-transition", dialogue.id);
support("public-movement", "Public climate movement", "awareness", 14, { awareness: 60, support: 20 }, "indigenous-leadership", dialogue.id, true);
const coalition = support("coalition", "Build a coalition", "politics", 4, { support: 20 }, "coalition");
support("agreement", "Cross-party agreement", "politics", 7, { support: 30, awareness: 4 }, "citizens-assembly", coalition.id);
const mandate = support("mandate", "Win an election mandate", "politics", 18, { support: 25 }, "clean-power-standard", coalition.id, true);
mandate.wildcard = true;
mandate.description = "Win a lawful electoral mandate. Success gives later ordinary policies at least 96% approval.";

export const V11_CARDS = cards;
export const V11_BY_ID = new Map(cards.map(card => [card.id, card]));
export function v11Settings(history: { cardId: string; accepted: boolean; kind?: string }[]): PolicySettings {
  const settings = defaultSettings();
  for (const action of history) {
    const card = V11_BY_ID.get(action.cardId);
    if (action.kind === "policy" && action.accepted && card?.factor) settings[card.factor] = card.target!;
  }
  return settings;
}
