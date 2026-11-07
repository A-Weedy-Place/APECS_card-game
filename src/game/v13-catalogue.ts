import { V11_CARDS, type PolicyCardV11 } from "./v11-catalogue";
import type { Effects } from "./types";

// Explicit game trade-offs. Other model cards leave support and engagement alone.
const policyEffects: Record<string, Effects> = {
  "coal-v11-2": { support: -7 },
  "oil-v11-2": { support: -7 },
  "gas-v11-2": { support: -7 },
  "bioenergy-v11-2": { awareness: -6 },
  "carbon-price-v11-2": { support: -7 },
  "renewables-v11-1": { economy: 3 },
  "nuclear-v11-1": { support: -8 },
  "nuclear-v11-2": { support: 5, economy: -4 },
  "population-v11-1": { awareness: -45, support: -35 },
  "gdp-v11-1": { economy: -40, support: -30 },
};

export const SUPPORT_ROTATION = ["economics", "politics", "awareness"] as const;

export const REVENUE_FLOORS: Record<string, number> = {
  "revenue-v11": 25,
  "finance-v11": 50,
  "finance-breakthrough-v11": 100,
};

const supportUpgrades: Record<string, Partial<PolicyCardV11>> = {
  "revenue-v11": { effects: { economy: 25 }, description: "Start building a steady source of coins for later policy rounds." },
  "finance-v11": { effects: { economy: 25 }, description: "Expand your revenue programme to fund larger policy packages." },
  "finance-breakthrough-v11": { tier: 3, requires: "finance-v11", role: "enabler", effects: { economy: 50 }, description: "Bring your recurring policy income to 8 coins per round." },
  "public-movement-v11": { tier: 3, requires: "fair-transition-v11" },
  "mandate-v11": { tier: 3, requires: "agreement-v11" },
};

export const V13_CARDS: PolicyCardV11[] = V11_CARDS.map(card => card.factor
  ? { ...card, effects: policyEffects[card.id] ?? {} }
  : { ...card, repeatable: false, ...supportUpgrades[card.id] });
export const V13_BY_ID = new Map(V13_CARDS.map(card => [card.id, card]));
